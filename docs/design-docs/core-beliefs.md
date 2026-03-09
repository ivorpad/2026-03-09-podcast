# Core Beliefs

Operating principles for agent-first development of Harness CRM.

## 1. Schemas Are the Harness

Zod schemas constrain AI output. Every AI feature defines its output schema in `src/shared/schemas.ts`. The schema IS the contract — if it parses, it's valid.

## 2. Human-in-the-Loop by Default

AI features suggest, humans decide. Enrichment data is never auto-saved. Summaries are explicitly requested. The agent augments judgment, it doesn't replace it.

## 3. Repository Is the Source of Truth

If it's not in the repo, it doesn't exist for the agent. Design decisions, product specs, architecture — all versioned in `docs/`.

## 4. Boring Technology

SQLite, not Postgres. tRPC, not GraphQL. Server components where possible, client where needed. Prefer well-documented, stable tools that agents can reason about.

## 5. Progressive Disclosure for Context

CLAUDE.md is a map, not a manual. Agents read what they need from `docs/` based on the task. Don't front-load everything.

## 6. Validate at Boundaries

All inputs validated via Zod. All AI outputs validated via Zod. Inside the boundary, trust the types.

## 7. Fix the Environment, Not the Prompt

When the agent struggles, the fix is adding structure (schemas, docs, conventions) — not rewriting the prompt ten times.
