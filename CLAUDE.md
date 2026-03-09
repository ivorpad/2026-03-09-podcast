# CLAUDE.md

CRM — a demo CRM built with agent-first harness engineering.

## Quick Start

- `pnpm dev` — starts dev server on port 3005
- `pnpm db:migrate` — run database migrations
- `pnpm lint` — run linter
- Port: 3005

## Stack

- **Runtime:** Next.js 16 (App Router), React 19, TypeScript 5
- **API:** tRPC v11, Zod v4 for validation
- **Database:** SQLite via Drizzle ORM (better-sqlite3)
- **UI:** shadcn/ui (Base UI), Tailwind CSS v4, Lucide icons
- **AI:** Anthropic SDK (Claude Sonnet) for structured outputs
- **Package manager:** `pnpm` (alias `pp`)

## Subagents

See [SUBAGENTS.md](./SUBAGENTS.md) for the full subagents workflow.

**When to Use Subagents**:
- Research tasks (e.g., "research best practices for memory management in C")
- Exploration of alternative approaches
- Parallel analysis of different components
- Code review and testing of specific modules
- Documentation generation
- Debugging specific functions or modules

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full domain and layer map.

Three entities: **Companies**, **Contacts**, **Deals**.
Three AI features: contact summary, deal next-action, contact enrichment.

## Key Conventions

- Shared Zod schemas in `src/shared/schemas.ts` — used by both client and server
- tRPC routers in `src/server/routers/` — one per entity + `ai.ts`
- AI outputs validated through Zod schemas (the harness pattern)
- All AI suggestions are human-in-the-loop: enrichment returns suggestions, doesn't auto-save

## MVP Rules

- No over-engineering. No Redis, caches, or premature abstractions
- No backward compatibility — pre-users MVP, just refactor directly
- No migration/compat code, no feature flags, no shims

## Workflow

- Run after every change (tests, dev server, etc.)
- When an error is pasted, read the source, fix it, run it. Skip the explanation
- "commit and push" is a single atomic action
- When a screenshot is provided, find the visual bug and fix the code

## Documentation Map

All deep context lives in `docs/`. Read what you need, not everything.

# ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in PLANS.md) from design to implementation.

| Document | Purpose |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Domain model, layers, dependency rules |
| [docs/DESIGN.md](./docs/DESIGN.md) | Visual design system and UI patterns |
| [docs/FRONTEND.md](./docs/FRONTEND.md) | Frontend architecture and component conventions |
| [docs/PLANS.md](./docs/PLANS.md) | Current roadmap and priorities |
| [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) | Product principles and user mental model |
| [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) | Quality grades by domain |
| [docs/RELIABILITY.md](./docs/RELIABILITY.md) | Error handling and data integrity rules |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security boundaries and validation rules |
| [docs/design-docs/](./docs/design-docs/) | Design decisions and core beliefs |
| [docs/product-specs/](./docs/product-specs/) | Feature specifications |
| [docs/exec-plans/](./docs/exec-plans/) | Active and completed execution plans |
| [docs/generated/](./docs/generated/) | Auto-generated docs (DB schema, etc.) |
| [docs/references/](./docs/references/) | External reference material for LLMs |