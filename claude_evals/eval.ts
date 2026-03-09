#!/usr/bin/env bun
/**
 * CLAUDE.md eval server — hono server that runs eval agents via the SDK.
 * Same pattern as skill-check-server: runs as a persistent process so
 * query() inherits the authenticated session context.
 *
 * Start:  bun --watch claude_evals/eval.ts
 * Run:    curl http://localhost:7484/run
 * Health: curl http://localhost:7484/health
 */

import { Hono } from "hono"
import { query, type SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk"
import { resolve } from "path"

// ── Config ──────────────────────────────────────────────────────────────────
const PROJECT_ROOT = resolve(import.meta.dir, "..")
const VARIANTS_DIR = resolve(import.meta.dir, "variants")
const PORT = 7484
const MODEL = "claude-opus-4-6"

// Strip only CLAUDECODE (session marker) — keep everything else for auth
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => k !== "CLAUDECODE")
)

const log = (msg: string) => console.log(`[eval] ${msg}`)

// ── Tasks ───────────────────────────────────────────────────────────────────
const tasks = [
  {
    id: "error-fix",
    prompt: `Fix this error:\n\nTypeError: Cannot read properties of undefined (reading 'map')\n  at ContactList (src/components/contacts/contact-list.tsx:42:18)\n  at renderWithHooks (node_modules/react-dom/...)\n\nThe contacts array is sometimes undefined when the tRPC query hasn't resolved yet.`,
    rubric: [
      { id: "no-explanation", desc: "Doesn't write a diagnosis paragraph before the fix — goes straight to reading source and fixing", weight: 3 },
      { id: "reads-source", desc: "Reads the actual source file before editing", weight: 2 },
      { id: "runs-lint", desc: "Runs pnpm lint (not npm lint) after the fix", weight: 3 },
      { id: "minimal-fix", desc: "Doesn't add unnecessary error handling, wrappers, or refactoring beyond the fix", weight: 2 },
    ],
  },
  {
    id: "add-feature",
    prompt: `Add a "last contacted" date field to the contacts table in the Drizzle schema. Just the schema change and migration — nothing else.`,
    rubric: [
      { id: "uses-pnpm", desc: "Uses pnpm (not npm) for any commands", weight: 3 },
      { id: "no-over-engineer", desc: "Doesn't add extra features, helpers, or utils beyond what was asked", weight: 3 },
      { id: "no-extra-types", desc: "Doesn't add TypeScript types or comments to unchanged code", weight: 2 },
      { id: "no-docs-read", desc: "Doesn't read all docs/ upfront — only reads what's needed", weight: 2 },
    ],
  },
]

// ── Run a single eval ───────────────────────────────────────────────────────
type RubricItem = { id: string; desc: string; weight: number }

async function runEval(
  variantName: string,
  variantDir: string,
  task: typeof tasks[0]
): Promise<{ variant: string; task: string; messages: string[]; cost: number }> {
  const messages: string[] = []
  log(`[start] ${variantName} / ${task.id}`)

  const conversation = query({
    prompt: task.prompt,
    options: {
      cwd: variantDir,
      additionalDirectories: [PROJECT_ROOT],
      model: MODEL,
      settingSources: ["user", "project"],
      tools: ["Read", "Edit", "Glob", "Grep", "Bash"],
      allowedTools: ["Read", "Edit", "Glob", "Grep", "Bash"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: 5,
      maxBudgetUsd: 1.00,
      effort: "low",
      persistSession: false,
      env: cleanEnv,
    },
  })

  for await (const msg of conversation) {
    if (msg.type === "assistant") {
      const aMsg = msg as SDKAssistantMessage
      for (const block of aMsg.message.content) {
        if (block.type === "text") {
          messages.push(`[text] ${block.text}`)
        } else if (block.type === "tool_use") {
          messages.push(`[tool] ${block.name}: ${JSON.stringify(block.input).slice(0, 300)}`)
        }
      }
    } else if (msg.type === "result") {
      return { variant: variantName, task: task.id, messages, cost: msg.total_cost_usd }
    }
  }

  return { variant: variantName, task: task.id, messages, cost: 0 }
}

// ── Grade transcript against rubric ─────────────────────────────────────────
async function grade(
  transcript: string[],
  rubric: RubricItem[],
  claudeMdPath: string,
): Promise<{ scores: Record<string, { pass: boolean; reason: string }>; total: number; max: number }> {
  const claudeMd = await Bun.file(claudeMdPath).text()
  const rubricText = rubric
    .map((r, i) => `${i + 1}. [${r.id}] (weight: ${r.weight}) ${r.desc}`)
    .join("\n")

  const graderPrompt = `You are grading an AI coding agent's behavior against a CLAUDE.md file's rules.

## CLAUDE.md being tested:
${claudeMd}

## Agent transcript:
${transcript.join("\n")}

## Rubric:
${rubricText}

For each rubric item, determine if the agent PASSED or FAILED based on the transcript.
Look at tool calls, text output, and the order of operations.

Respond with ONLY valid JSON, no markdown fences:
{
  "scores": {
    "<rubric_id>": { "pass": true/false, "reason": "brief explanation" }
  }
}`

  const graderConversation = query({
    prompt: graderPrompt,
    options: {
      model: MODEL,
      settingSources: [],
      tools: [],
      permissionMode: "plan",
      maxTurns: 1,
      maxBudgetUsd: 0.50,
      effort: "low",
      persistSession: false,
      env: cleanEnv,
    },
  })

  let resultText = ""
  for await (const msg of graderConversation) {
    if (msg.type === "assistant") {
      const aMsg = msg as SDKAssistantMessage
      for (const block of aMsg.message.content) {
        if (block.type === "text") resultText += block.text
      }
    }
  }

  try {
    const jsonStr = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(jsonStr)
    const scores = parsed.scores as Record<string, { pass: boolean; reason: string }>
    let total = 0
    let max = 0
    for (const r of rubric) {
      max += r.weight
      if (scores[r.id]?.pass) total += r.weight
    }
    return { scores, total, max }
  } catch {
    log(`[warn] Grader returned invalid JSON: ${resultText.slice(0, 300)}`)
    return { scores: {}, total: 0, max: rubric.reduce((a, r) => a + r.weight, 0) }
  }
}

// ── Run all evals ───────────────────────────────────────────────────────────
async function runAllEvals() {
  const variants = [
    { name: "original", dir: resolve(VARIANTS_DIR, "original") },
    { name: "improved", dir: resolve(VARIANTS_DIR, "improved") },
  ]

  log(`${variants.length} variants x ${tasks.length} tasks = ${variants.length * tasks.length} evals`)
  log(`model: ${MODEL} | project: ${PROJECT_ROOT}`)

  const evalRuns = variants.flatMap((v) =>
    tasks.map((task) => ({ ...v, task }))
  )

  // Run all 4 evals in parallel
  const results = await Promise.all(
    evalRuns.map(async ({ name, dir, task }) => {
      const evalResult = await runEval(name, dir, task)
      log(`[done] ${name} / ${task.id} — ${evalResult.messages.length} msgs, $${evalResult.cost.toFixed(3)}`)

      const gradeResult = await grade(
        evalResult.messages,
        task.rubric,
        resolve(dir, "CLAUDE.md"),
      )
      log(`[graded] ${name} / ${task.id} — ${gradeResult.total}/${gradeResult.max}`)

      return { ...evalResult, grade: gradeResult }
    })
  )

  // ── Build report ────────────────────────────────────────────────────────
  const lines: string[] = []
  const summaryByVariant: Record<string, { total: number; max: number }> = {}

  lines.push("=" .repeat(70))
  lines.push("RESULTS")
  lines.push("=".repeat(70))

  for (const r of results) {
    lines.push(`\n## ${r.variant} / ${r.task}  ($${r.cost.toFixed(3)})`)
    lines.push("-".repeat(50))

    if (!summaryByVariant[r.variant]) summaryByVariant[r.variant] = { total: 0, max: 0 }
    summaryByVariant[r.variant].total += r.grade.total
    summaryByVariant[r.variant].max += r.grade.max

    for (const [id, score] of Object.entries(r.grade.scores)) {
      const icon = score.pass ? "PASS" : "FAIL"
      lines.push(`  ${icon}  ${id}: ${score.reason}`)
    }
    lines.push(`  Score: ${r.grade.total}/${r.grade.max}`)
  }

  lines.push("\n" + "=".repeat(70))
  lines.push("SUMMARY")
  lines.push("=".repeat(70))
  for (const [variant, summary] of Object.entries(summaryByVariant)) {
    const pct = ((summary.total / summary.max) * 100).toFixed(0)
    lines.push(`  ${variant}: ${summary.total}/${summary.max} (${pct}%)`)
  }

  const totalCost = results.reduce((a, r) => a + r.cost, 0)
  lines.push(`\nTotal cost: $${totalCost.toFixed(3)}`)

  const report = lines.join("\n")
  log("eval complete")
  return { results, report }
}

// ── Hono server ─────────────────────────────────────────────────────────────
const app = new Hono()

let running = false

app.get("/run", async (c) => {
  if (running) return c.json({ error: "eval already running" }, 409)
  running = true
  try {
    const { report } = await runAllEvals()
    return c.text(report)
  } catch (e) {
    log(`error: ${e}`)
    return c.json({ error: String(e) }, 500)
  } finally {
    running = false
  }
})

app.get("/health", (c) => c.json({ ok: true }))

log(`server on :${PORT}`)
log(`curl http://localhost:${PORT}/run to start eval`)
const server = { port: PORT, fetch: app.fetch }
export default server
