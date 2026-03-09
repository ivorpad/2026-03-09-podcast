import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { config } from "../skill-check-config";
import type { Violation, LearnedRule, DiffFile } from "./types";
import { parseDiffFiles, testPattern } from "./diff";

const RULES_PATH = join(import.meta.dir, "..", "learned-rules.json");

export async function loadRules(): Promise<LearnedRule[]> {
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
  const message = `[${v.skill}] ${v.rule} → ${v.fix}`;
  const filePattern = v.filePattern ?? "\\.tsx?$";

  if (v.pattern) {
    try {
      new RegExp(v.pattern);
    } catch {
      return { pattern: "", filePattern, message, skill: v.skill, createdAt: new Date().toISOString(), llmOnly: true };
    }
    return { pattern: v.pattern, filePattern, message, skill: v.skill, createdAt: new Date().toISOString() };
  }

  return { pattern: "", filePattern, message, skill: v.skill, createdAt: new Date().toISOString(), llmOnly: true };
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
      env: config.env,
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

export async function graduateViolations(violations: Violation[], diff: string): Promise<number> {
  const existing = await loadRules();
  const existingMessages = new Set(existing.map((r) => r.message));
  const existingPatterns = new Set(existing.filter((r) => !r.llmOnly).map((r) => r.pattern));
  const files = parseDiffFiles(diff);

  const candidates: LearnedRule[] = [];
  for (const v of violations) {
    const rule = violationToRule(v);
    if (!rule) continue;
    if (existingMessages.has(rule.message)) continue;
    if (rule.llmOnly) {
      candidates.push(rule);
    } else {
      if (existingPatterns.has(rule.pattern)) continue;
      if (!testPattern(rule.pattern, files, rule.filePattern)) {
        console.log(`[skill-check] rejected (no match): ${rule.pattern}`);
        continue;
      }
      candidates.push(rule);
    }
  }

  if (candidates.length === 0) return 0;
  console.log(`[skill-check] ${candidates.length} candidates passed validation, LLM dedup...`);

  const deduped = await dedupWithLLM(candidates, existing);
  console.log(`[skill-check] LLM kept ${deduped.length}/${candidates.length}`);

  for (const rule of deduped) {
    existing.push(rule);
    console.log(`[skill-check] graduated: ${rule.llmOnly ? "LLM-ONLY" : rule.pattern} | ${rule.message.slice(0, 60)}`);
  }

  if (deduped.length > 0) await saveRules(existing);
  return deduped.length;
}
