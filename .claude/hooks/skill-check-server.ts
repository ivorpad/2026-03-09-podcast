#!/usr/bin/env bun
/**
 * Skill check server — persistent bun+hono daemon.
 * POST /check with {cwd} → detects which skills apply to changed files,
 * then spawns a sub-agent per relevant skill to review.
 */

import { Hono } from "hono";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf?\b/,
  /\bgit\s+(push|reset|checkout\s+--|clean|branch\s+-[dD])/,
  /\bdrop\s+(table|database)\b/i,
  /\btruncate\b/i,
  /\b(kill|pkill|killall)\b/,
  /\bcurl\b.*\b(POST|PUT|DELETE|PATCH)\b/i,
  /\bnpx?\s/,
  /\bpnpm\s+(add|remove|install)\b/,
  /\bchmod\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
];

function isDangerous(command: string): string | null {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) return `Blocked: matches ${pattern}`;
  }
  return null;
}

function isPreToolUseInput(input: unknown): input is PreToolUseHookInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "tool_name" in input &&
    "tool_input" in input
  );
}

function hasBashCommand(toolInput: unknown): toolInput is { command: string } {
  return (
    typeof toolInput === "object" &&
    toolInput !== null &&
    "command" in toolInput &&
    typeof (toolInput as { command: unknown }).command === "string"
  );
}

const preToolUseHook = {
  hooks: [async (input: unknown) => {
    if (!isPreToolUseInput(input)) return {};
    const { tool_name, tool_input } = input;
    if (tool_name === "Bash" && hasBashCommand(tool_input)) {
      const cmd = tool_input.command;
      const reason = isDangerous(cmd);
      if (reason) {
        console.log(`[skill-check] DENIED: ${cmd.slice(0, 80)} — ${reason}`);
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse" as const,
            permissionDecision: "deny" as const,
            permissionDecisionReason: reason,
          },
        };
      }
    }
    return {};
  }],
};

const baseEnv = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("CLAUDE"))
  ),
  ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
  ANTHROPIC_BASE_URL: 'https://coding-intl.dashscope.aliyuncs.com/apps/anthropic',
  ANTHROPIC_MODEL: 'qwen3.5-plus',
};

type Violation = { file: string; skill: string; rule: string; fix: string; pattern?: string; filePattern?: string };
type LearnedRule = { pattern: string; filePattern: string; message: string; skill: string; createdAt: string };

const RULES_PATH = join(import.meta.dir, "learned-rules.json");

async function loadRules(): Promise<LearnedRule[]> {
  try {
    const raw = await readFile(RULES_PATH, "utf-8");
    return JSON.parse(raw) as LearnedRule[];
  } catch {
    return [];
  }
}

async function saveRules(rules: LearnedRule[]): Promise<void> {
  await writeFile(RULES_PATH, JSON.stringify(rules, null, 2) + "\n");
}

function violationToRule(v: Violation): LearnedRule | null {
  // AI provides pattern + filePattern directly in the violation
  if (!v.pattern) return null;
  // Validate it's a usable regex
  try {
    new RegExp(v.pattern);
  } catch {
    return null;
  }
  return {
    pattern: v.pattern,
    filePattern: v.filePattern ?? "\\.tsx?$",
    message: `[${v.skill}] ${v.rule} → ${v.fix}`,
    skill: v.skill,
    createdAt: new Date().toISOString(),
  };
}

async function graduateViolations(violations: Violation[]): Promise<number> {
  const existing = await loadRules();
  const existingPatterns = new Set(existing.map((r) => r.pattern));
  let added = 0;

  for (const v of violations) {
    const rule = violationToRule(v);
    if (rule && !existingPatterns.has(rule.pattern)) {
      existing.push(rule);
      existingPatterns.add(rule.pattern);
      added++;
      console.log(`[skill-check] graduated rule: ${rule.pattern}`);
    }
  }

  if (added > 0) await saveRules(existing);
  return added;
}

function extractChangedFiles(diff: string): string[] {
  const files: string[] = [];
  for (const line of diff.split("\n")) {
    const match = line.match(/^diff --git a\/(.+) b\//);
    if (match) files.push(match[1]);
  }
  return files;
}

// Extract file_patterns from SKILL.md frontmatter or description
// Skills should declare: `file_patterns: ["*.tsx", "routers/", "db/"]`
async function loadSkillFilePatterns(cwd: string, skillName: string): Promise<string[]> {
  const skillMd = join(cwd, ".claude", "skills", skillName, "SKILL.md");
  try {
    const content = await readFile(skillMd, "utf-8");
    // Look for file_patterns in YAML frontmatter or as a line
    const match = content.match(/file_patterns:\s*\[([^\]]+)\]/);
    if (match) {
      return match[1].split(",").map((s) => s.trim().replace(/["']/g, ""));
    }
    // Fallback: extract from description keywords
    const lower = content.toLowerCase();
    const patterns: string[] = [];
    if (lower.includes("typescript") || lower.includes(".ts")) patterns.push(".ts", ".tsx");
    if (lower.includes("react") || lower.includes(".tsx") || lower.includes(".jsx")) patterns.push(".tsx", ".jsx");
    if (lower.includes("next.js") || lower.includes("app router")) patterns.push("src/app/", "next.config", "src/components/", ".tsx");
    if (lower.includes("trpc") || lower.includes("router")) patterns.push("trpc", "routers/");
    if (lower.includes("drizzle") || lower.includes("database") || lower.includes("schema")) patterns.push("db/", "schema", "drizzle");
    if (lower.includes("shadcn") || lower.includes("component registry")) patterns.push("components/ui/", "components.json");
    if (lower.includes("component") && !lower.includes("shadcn")) patterns.push("components/");
    return patterns;
  } catch {
    return [];
  }
}

async function matchSkills(cwd: string, allSkills: string[], changedFiles: string[]): Promise<string[]> {
  const matched: string[] = [];
  for (const skill of allSkills) {
    const patterns = await loadSkillFilePatterns(cwd, skill);
    if (patterns.length === 0) continue;
    const relevant = changedFiles.some((f) =>
      patterns.some((p) => f.includes(p) || f.endsWith(p))
    );
    if (relevant) matched.push(skill);
  }
  return matched;
}

async function discoverSkills(cwd: string): Promise<string[]> {
  const skillsDir = join(cwd, ".claude", "skills");
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function reviewSkill(
  cwd: string,
  diff: string,
  skillName: string,
  coveredRules: LearnedRule[]
): Promise<Violation[]> {
  const skillDir = `.claude/skills/${skillName}`;
  const skipSection = coveredRules.length > 0
    ? `\n\nThese patterns are ALREADY covered by automated lint rules (across ALL skills) — do NOT flag violations that overlap with ANY of these, even if from a different skill:\n${coveredRules.map((r) => `- ${r.message}`).join("\n")}\n`
    : "";

  let text = "";
  const q = query({
    prompt: `You are a focused code reviewer for the "${skillName}" skill.

Here is the git diff to review:
\`\`\`diff
${diff}
\`\`\`

Do the following:
1. Read \`${skillDir}/SKILL.md\` to understand the skill guidelines.
2. List \`${skillDir}/references/\` if it exists. Read key reference files.
3. Review ONLY the added/changed lines in the diff against these specific skill guidelines.
4. Only flag clear violations — not style preferences.${skipSection}

Output your verdict as JSON on its own line prefixed with VERDICT:
- No violations: VERDICT: {"ok": true}
- Violations: VERDICT: {"ok": false, "violations": [{"file": "path", "skill": "${skillName}", "rule": "what was violated", "fix": "how to fix", "pattern": "grep -E regex to detect this violation", "filePattern": "regex matching file paths this applies to"}]}

IMPORTANT rules for violations:
- "pattern" must be a valid grep -E regex that catches this violation in source code. "filePattern" should match file paths (e.g. "\\\\.tsx?$", "routers/", "db/").
- Do NOT emit a violation if an existing learned rule (listed above) already covers the same concept, even if your regex would be slightly different. For example, if there's already a rule catching ": any", don't add another variant of "no any". Deduplicate by INTENT, not by exact regex.
- Prefer broad, reusable patterns over narrow ones. One rule catching all ": any" is better than separate rules for "any = await db", "any = JSON.parse", etc.`,
    options: {
      cwd,
      maxTurns: 6,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      allowedTools: ["Read", "Glob"],
      disallowedTools: ["Write", "Edit", "Bash"],
      env: baseEnv,
      hooks: { PreToolUse: [preToolUseHook] },
    },
  });

  for await (const msg of q) {
    if (msg.type === "assistant") {
      for (const b of msg.message.content) {
        if (b.type === "text") text += b.text;
      }
    }
    if (msg.type === "result") {
      console.log(`[skill-check:${skillName}] turns: ${msg.num_turns}, cost: $${msg.total_cost_usd?.toFixed(4)}`);
    }
  }

  const verdictMatch = text.match(/VERDICT:\s*(\{[\s\S]*?\})\s*$/m);
  if (!verdictMatch) return [];

  try {
    const verdict: unknown = JSON.parse(verdictMatch[1]);
    if (
      typeof verdict === "object" &&
      verdict !== null &&
      "ok" in verdict &&
      !(verdict as { ok: boolean }).ok &&
      "violations" in verdict
    ) {
      return (verdict as { violations: Violation[] }).violations;
    }
  } catch {
    console.log(`[skill-check:${skillName}] failed to parse verdict`);
  }
  return [];
}

// Prevent SDK child process crashes from killing the server
process.on("uncaughtException", (err) => {
  console.error(`[skill-check] uncaught:`, String(err).slice(0, 200));
});
process.on("unhandledRejection", (err) => {
  console.error(`[skill-check] unhandled rejection:`, String(err).slice(0, 200));
});

const PORT = 7483;
const app = new Hono();

app.post("/check", async (c) => {
  const { cwd } = await c.req.json<{ cwd: string }>();
  if (!cwd) return c.json({ error: "missing cwd" }, 400);

  try {
    // Get diff once
    const unstaged = Bun.spawnSync(["git", "diff", "--no-color", "--", ".", ":!pnpm-lock.yaml", ":!*.db-wal", ":!*.db-shm", ":!*.db", ":!*.pyc"], { cwd });
    const staged = Bun.spawnSync(["git", "diff", "--cached", "--no-color", "--", ".", ":!pnpm-lock.yaml", ":!*.db-wal", ":!*.db-shm", ":!*.db", ":!*.pyc"], { cwd });
    const diff = unstaged.stdout.toString() + staged.stdout.toString();

    if (!diff.trim()) {
      console.log(`[skill-check] no diff, allowing`);
      return c.json({});
    }

    // Detect which files changed → match to relevant skills only
    const changedFiles = extractChangedFiles(diff);
    const allSkills = await discoverSkills(cwd);
    const relevantSkills = await matchSkills(cwd, allSkills, changedFiles);

    if (relevantSkills.length === 0) {
      console.log(`[skill-check] no relevant skills for changed files: ${changedFiles.join(", ")}`);
      return c.json({});
    }

    // Load existing learned rules so AI skips already-covered patterns
    const coveredRules = await loadRules();
    console.log(`[skill-check] ${changedFiles.length} files changed → ${relevantSkills.length} skills: ${relevantSkills.join(", ")} (${coveredRules.length} rules already learned)`);

    // Run sub-agents with limited concurrency
    const CONCURRENCY = 2;
    const results: Violation[][] = [];
    for (let i = 0; i < relevantSkills.length; i += CONCURRENCY) {
      const batch = relevantSkills.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((skill) =>
          reviewSkill(cwd, diff, skill, coveredRules).catch((err) => {
            console.error(`[skill-check:${skill}] error:`, String(err).slice(0, 200));
            return [] as Violation[];
          })
        )
      );
      results.push(...batchResults);
    }

    const allViolations = results.flat();

    if (allViolations.length === 0) {
      console.log(`[skill-check] all clear for ${cwd}`);
      return c.json({});
    }

    const lines = ["**Skill Check: Violations Found**", ""];
    for (const viol of allViolations) {
      lines.push(`- **[${viol.skill}]** ${viol.rule} in \`${viol.file}\``);
      lines.push(`  Fix: ${viol.fix}`);
      lines.push("");
    }
    const message = lines.join("\n");
    // Graduate violations into learned rules for next time
    const graduated = await graduateViolations(allViolations);
    if (graduated > 0) {
      console.log(`[skill-check] graduated ${graduated} new lint rules`);
    }

    console.log(`[skill-check] blocking with ${allViolations.length} violations`);
    return c.json({ decision: "block", reason: message, systemMessage: message });
  } catch (e) {
    console.error(`[skill-check] error:`, e);
    return c.json({});
  }
});

app.get("/health", (c) => c.json({ ok: true }));

console.log(`Skill check server on :${PORT}`);
const server = { port: PORT, fetch: app.fetch };
export default server;
