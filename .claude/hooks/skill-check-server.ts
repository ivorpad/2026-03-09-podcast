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


type DiffFile = { path: string; content: string };

function parseDiffFiles(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let currentFile = "";
  let currentLines: string[] = [];
  for (const line of diff.split("\n")) {
    const m = line.match(/^diff --git a\/(.+) b\//);
    if (m) {
      if (currentFile && currentLines.length > 0) files.push({ path: currentFile, content: currentLines.join(" ") });
      currentFile = m[1];
      currentLines = [];
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      currentLines.push(line.slice(1));
    }
  }
  if (currentFile && currentLines.length > 0) files.push({ path: currentFile, content: currentLines.join(" ") });
  return files;
}

function testPattern(pattern: string, files: DiffFile[], filePattern?: string): boolean {
  const regex = new RegExp(pattern);
  const fp = filePattern ? new RegExp(filePattern) : null;
  return files.some((f) => (!fp || fp.test(f.path)) && regex.test(f.content));
}


async function dedupWithLLM(
  candidates: LearnedRule[],
  existing: LearnedRule[]
): Promise<LearnedRule[]> {
  if (candidates.length === 0) return [];

  const prompt = `You are deduplicating lint rules. Given EXISTING rules and CANDIDATE new rules, return ONLY the candidates that are genuinely new — not duplicates or narrower variants of existing rules.

EXISTING RULES:
${existing.map((r, i) => `${i + 1}. pattern: ${r.pattern} | ${r.message}`).join("\n")}

CANDIDATE NEW RULES:
${candidates.map((r, i) => `${i + 1}. pattern: ${r.pattern} | ${r.message}`).join("\n")}

Dedup rules:
- If two candidates cover the same concept (e.g. "as Config" and "as User" are both "type assertions"), keep only the BROADEST one
- If a candidate overlaps with an existing rule (same concept, even if different regex), REMOVE it
- If two candidates are identical in intent but from different skills, keep one

Return a JSON array of candidate INDEXES (1-based) to KEEP.
KEEP: [1, 4, 7]
If none should be kept: KEEP: []`;

  let text = "";
  const q = query({
    prompt,
    options: {
      maxTurns: 1,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      allowedTools: [],
      env: baseEnv,
    },
  });
  for await (const msg of q) {
    if (msg.type === "assistant") {
      for (const b of msg.message.content) {
        if (b.type === "text") text += b.text;
      }
    }
    if (msg.type === "result") {
      console.log(`[skill-check:dedup] turns: ${msg.num_turns}, cost: $${msg.total_cost_usd?.toFixed(4)}`);
    }
  }

  const keepMatch = text.match(/KEEP:\s*\[([^\]]*)\]/);
  if (!keepMatch) {
    console.log(`[skill-check:dedup] failed to parse, keeping all`);
    return candidates;
  }
  const keepIndexes = keepMatch[1].split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
  return candidates.filter((_, i) => keepIndexes.includes(i + 1));
}

async function graduateViolations(violations: Violation[], diff: string): Promise<number> {
  const existing = await loadRules();
  const existingPatterns = new Set(existing.map((r) => r.pattern));
  const files = parseDiffFiles(diff);

  // Phase 1: validate — must have valid regex that matches the diff
  const candidates: LearnedRule[] = [];
  for (const v of violations) {
    const rule = violationToRule(v);
    if (!rule) continue;
    if (existingPatterns.has(rule.pattern)) continue;
    if (!testPattern(rule.pattern, files, rule.filePattern)) {
      console.log(`[skill-check] rejected (no match): ${rule.pattern}`);
      continue;
    }
    candidates.push(rule);
  }

  if (candidates.length === 0) return 0;
  console.log(`[skill-check] ${candidates.length} candidates passed validation, LLM dedup...`);

  // Phase 2: LLM dedup
  const deduped = await dedupWithLLM(candidates, existing);
  console.log(`[skill-check] LLM kept ${deduped.length}/${candidates.length}`);

  for (const rule of deduped) {
    existing.push(rule);
    console.log(`[skill-check] graduated: ${rule.pattern}`);
  }

  if (deduped.length > 0) await saveRules(existing);
  return deduped.length;
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
    // No file_patterns declared — skip this skill (require explicit opt-in)
    console.log(`[skill-check] skill "${skillName}" has no file_patterns in SKILL.md — skipping`);
    return [];
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

async function loadSkillContent(cwd: string, skillName: string): Promise<string> {
  const skillMd = join(cwd, ".claude", "skills", skillName, "SKILL.md");
  try {
    return await readFile(skillMd, "utf-8");
  } catch {
    return "";
  }
}

async function reviewSkill(
  cwd: string,
  diff: string,
  skillName: string,
  coveredRules: LearnedRule[]
): Promise<Violation[]> {
  const skillContent = await loadSkillContent(cwd, skillName);
  const skipSection = coveredRules.length > 0
    ? `\nALREADY COVERED (do NOT re-flag these):\n${coveredRules.map((r) => `- ${r.message}`).join("\n")}\n`
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
${skipSection}
## Instructions

Look at EVERY "Wrong" / "Anti-Pattern" / "Don't" example in the skill above. For each one, check if the diff contains that pattern. Be thorough — check every added line.

Common things to catch:
- Type assertions (\`as X\`) instead of \`satisfies\`
- \`enum\` instead of union types or const objects
- \`@ts-ignore\` / \`@ts-expect-error\`
- Optional fields modeling exclusive states instead of discriminated unions
- \`onClick\` on \`<div>\` instead of \`<button>\`
- Missing \`aria-label\` on icon-only buttons
- Array index as key on dynamic lists
- Hardcoded colors in inline styles
- \`window.location\` instead of \`useSearchParams\`
- \`router.push\` instead of \`<Link>\`
- Unnecessary \`"use client"\` when no hooks/interactivity
- \`useEffect\` to derive state that could be computed during render
- Inline object/array literals in JSX props (re-created every render)
- \`{count && <X/>}\` where count is a number (renders "0")

Output JSON on its own line prefixed with VERDICT:
- No violations: VERDICT: {"ok": true}
- Violations: VERDICT: {"ok": false, "violations": [{"file": "path", "skill": "${skillName}", "rule": "short description", "fix": "how to fix", "pattern": "grep -E regex", "filePattern": "file path regex"}]}

REGEX RULES (critical — patterns that don't match get rejected):
- Patterns are tested against file content with newlines collapsed to spaces.
- Use \\s+ or .* to bridge newlines. Do NOT use [^)]* or [^>]* (they break on JSX arrow functions).
- Before emitting, find the EXACT substring in the diff your regex matches. No match = rejected.
- "filePattern" matches file paths, e.g. "\\\\.tsx?$"
- Prefer broad patterns. One rule for all \`as X\` is better than separate rules per type.`,
    options: {
      cwd,
      maxTurns: 3,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      allowedTools: [],
      disallowedTools: ["Write", "Edit", "Bash", "Read", "Glob"],
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
    console.log(`[skill-check] ${allViolations.length} total violations from ${relevantSkills.length} skills`);
    for (const v of allViolations) {
      console.log(`[skill-check]   → [${v.skill}] ${v.rule.slice(0, 80)} | pattern: ${v.pattern ?? "NONE"}`);
    }

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
    const graduated = await graduateViolations(allViolations, diff);
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
