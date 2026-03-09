#!/usr/bin/env bun
/**
 * Skill check server — persistent bun+hono daemon.
 * POST /check with {cwd} → agent reviews git diff against .claude/skills/.
 */

import { Hono } from "hono";
import { query } from "@anthropic-ai/claude-agent-sdk";

const PORT = 7483;
const app = new Hono();

app.post("/check", async (c) => {
  const { cwd } = await c.req.json<{ cwd: string }>();
  if (!cwd) return c.json({ error: "missing cwd" }, 400);

  try {
    let text = "";
    const q = query({
      prompt: `You are a code reviewer. Do the following:

1. Run \`git diff --no-color -- . ':!pnpm-lock.yaml' ':!*.db-wal' ':!*.db-shm' ':!*.db' ':!*.pyc'\` to see unstaged changes, then also \`git diff --cached --no-color -- . ':!pnpm-lock.yaml' ':!*.db-wal' ':!*.db-shm' ':!*.db' ':!*.pyc'\` for staged changes. Combine both outputs.
2. List the .claude/skills/ directory. For each skill dir, read SKILL.md and list references/.
3. Decide which skills are relevant to the changed files.
4. For relevant skills, read the key reference files (from references/).
5. Review the added/changed lines in the diff against the loaded skill guidelines.

After your review, output your final verdict as a JSON object on its own line, prefixed with VERDICT:
- No violations: VERDICT: {"ok": true}
- Violations: VERDICT: {"ok": false, "violations": [{"file": "path", "skill": "name", "rule": "what was violated", "fix": "how to fix"}]}
- No skills or no diff: VERDICT: {"ok": true}`,
      options: {
        model: "haiku",
        cwd,
        maxTurns: 10,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        allowedTools: ["Bash", "Read", "Glob"],
        env: Object.fromEntries(
          Object.entries(process.env).filter(([k]) => !k.startsWith("CLAUDE"))
        ),
      },
    });

    for await (const msg of q) {
      if (msg.type === "assistant") {
        for (const b of msg.message.content) {
          if (b.type === "text") {
            text += b.text;
            process.stderr.write(b.text);
          }
          if (b.type === "tool_use") {
            console.log(`[skill-check] tool: ${b.name}(${JSON.stringify(b.input).slice(0, 120)})`);
          }
        }
      }
      if (msg.type === "result") {
        console.log(`[skill-check] result: ${msg.subtype}, turns: ${msg.num_turns}, cost: $${msg.total_cost_usd?.toFixed(4)}`);
      }
    }

    const verdictMatch = text.match(/VERDICT:\s*(\{[\s\S]*?\})\s*$/m);
    if (!verdictMatch) {
      console.log(`[skill-check] no verdict found, allowing`);
      return c.json({});
    }

    const verdict: unknown = JSON.parse(verdictMatch[1]);
    if (
      typeof verdict !== "object" ||
      verdict === null ||
      !("ok" in verdict)
    ) {
      console.log(`[skill-check] malformed verdict, allowing`);
      return c.json({});
    }

    const v = verdict as { ok: boolean; violations?: Array<{ file: string; skill: string; rule: string; fix: string }> };
    if (v.ok) {
      console.log(`[skill-check] all clear for ${cwd}`);
      return c.json({});
    }

    const violations = v.violations || [];
    const lines = ["**Skill Check: Violations Found**", ""];
    for (const viol of violations) {
      lines.push(`- **[${viol.skill}]** ${viol.rule} in \`${viol.file}\``);
      lines.push(`  Fix: ${viol.fix}`);
      lines.push("");
    }
    const message = lines.join("\n");
    console.log(`[skill-check] blocking: ${message.slice(0, 200)}`);
    return c.json({ decision: "block", reason: message, systemMessage: message });
  } catch (e) {
    console.error(`[skill-check] error:`, e);
    return c.json({});
  }
});

app.get("/health", (c) => c.json({ ok: true }));

console.log(`Skill check server on :${PORT}`);
export default { port: PORT, fetch: app.fetch };
