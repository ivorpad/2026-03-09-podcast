import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { config } from "../skill-check-config";
import { preToolUseHook } from "./dangerous-guard";
import type { Violation, LearnedRule } from "./types";

export async function discoverSkills(cwd: string): Promise<string[]> {
  const skillsDir = join(cwd, ".claude", "skills");
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function loadSkillFilePatterns(cwd: string, skillName: string): Promise<string[]> {
  const skillMd = join(cwd, ".claude", "skills", skillName, "SKILL.md");
  try {
    const content = await readFile(skillMd, "utf-8");
    const match = content.match(/file_patterns:\s*\[([^\]]+)\]/);
    if (match) {
      return match[1].split(",").map((s) => s.trim().replace(/["']/g, ""));
    }
    console.log(`[skill-check] skill "${skillName}" has no file_patterns in SKILL.md — skipping`);
    return [];
  } catch {
    return [];
  }
}

export async function matchSkills(cwd: string, allSkills: string[], changedFiles: string[]): Promise<string[]> {
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

async function loadSkillContent(cwd: string, skillName: string): Promise<string> {
  const skillMd = join(cwd, ".claude", "skills", skillName, "SKILL.md");
  try {
    return await readFile(skillMd, "utf-8");
  } catch {
    return "";
  }
}

export async function reviewSkill(
  cwd: string,
  diff: string,
  skillName: string,
  coveredRules: LearnedRule[]
): Promise<Violation[]> {
  const skillContent = await loadSkillContent(cwd, skillName);
  const regexRules = coveredRules.filter((r) => !r.llmOnly);
  const llmRules = coveredRules.filter((r) => r.llmOnly && r.skill === skillName);

  const skipSection = regexRules.length > 0
    ? `\nALREADY COVERED BY REGEX (do NOT re-flag these):\n${regexRules.map((r) => `- ${r.message}`).join("\n")}\n`
    : "";

  const llmChecks = llmRules.length > 0
    ? `\nLEARNED CHECKS (verify these EVERY time — they have no regex):\n${llmRules.map((r) => `- ${r.message}`).join("\n")}\n`
    : "";

  let text = "";
  const q = query({
    prompt: `You are an aggressive code reviewer. Your job is to find EVERY anti-pattern described in the skill guidelines below.

## Skill: ${skillName}

${skillContent}

## Git diff to review:
\`\`\`diff
${diff}
\`\`\`
${skipSection}${llmChecks}
## Instructions

Look at EVERY "Wrong" / "Anti-Pattern" / "Don't" example in the skill above. For each one, check if the diff contains that pattern. Be thorough — check every added line.

Your ONLY source of truth is the skill document above. Do NOT invent rules that aren't in the skill. Find violations based exclusively on what the skill defines as wrong.

Output JSON on its own line prefixed with VERDICT:
- No violations: VERDICT: {"ok": true}
- Violations: VERDICT: {"ok": false, "violations": [{"file": "path", "skill": "${skillName}", "rule": "short description", "fix": "how to fix", "pattern": "grep -E regex or null if structural", "filePattern": "file path regex"}]}

REGEX RULES (critical — patterns that don't match get rejected):
- Patterns are tested against file content with newlines collapsed to spaces.
- Use \\s+ or .* to bridge newlines. Do NOT use [^)]* or [^>]* (they break on JSX arrow functions).
- Before emitting, find the EXACT substring in the diff your regex matches. No match = rejected.
- "filePattern" matches file paths, e.g. "\\\\.tsx?$"
- Prefer broad patterns. One rule for all \`as X\` is better than separate rules per type.
- If a violation is STRUCTURAL and cannot be expressed as regex, set pattern to null. These become LLM-only rules.`,
    options: {
      cwd,
      maxTurns: 3,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      allowedTools: [],
      disallowedTools: ["Write", "Edit", "Bash", "Read", "Glob"],
      env: config.env,
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
