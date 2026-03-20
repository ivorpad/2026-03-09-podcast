# 2026-03-09-podcast — Claude Code & custom hooks

Companion repo for a **podcast about Claude Code**, with emphasis on **how this project uses [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)** under [`.claude/hooks/`](./.claude/hooks/).

The idea: listeners can follow along while you explain what the agent is allowed to do, what gets blocked, and how **long-running checks** (skill review) stay out of the hook process so you avoid recursion.

Also in the repo: a **small demo CRM** (Next.js, tRPC, Drizzle, AI suggestions) so episodes have real files and UI to point at—not only shell scripts.

## Claude Code hooks (`/.claude/hooks`)

Deep dive (design, recursion pitfalls, what failed before): [docs/references/hooks-architecture.md](./docs/references/hooks-architecture.md).

| Piece | Role |
|--------|------|
| [`skill-check.sh`](./.claude/hooks/skill-check.sh) | **Stop** hook: fast pass against `learned-rules.json`, then talks to the skill-check server for AI review of the diff vs project skills. |
| [`skill-check-server.ts`](./.claude/hooks/skill-check-server.ts) | Separate **Bun + Hono** process (port **7483**): runs Agent SDK `query()` so the hook itself does not recurse into Claude Code. Started alongside the app via `pnpm dev`. |
| [`post-lint.sh`](./.claude/hooks/post-lint.sh) | **PostToolUse** (after Edit/Write): ESLint on the touched file so the model can fix issues. |
| [`learned-lint.sh`](./.claude/hooks/learned-lint.sh) | **PreToolUse** (Edit/Write): instant check of new content against `learned-rules.json`. |
| [`file-size-guard.sh`](./.claude/hooks/file-size-guard.sh) | **PreToolUse**: blocks edits that would keep huge files growing (line-count guard). |
| [`lib/dangerous-guard.ts`](./.claude/hooks/lib/dangerous-guard.ts) | **PreToolUse** patterns for risky Bash (used from the skill-check path / Agent SDK hook input). |
| [`learned-rules.json`](./.claude/hooks/learned-rules.json) | Graduated rules the hooks enforce; TS helpers in [`lib/learned-rules.ts`](./.claude/hooks/lib/learned-rules.ts) support generation/dedup. |

Hook **registration** lives in your Claude Code project/user settings (not duplicated here). This folder is the implementation the podcast walks through.

## Quick start (demo app)

```bash
pnpm install
pnpm db:migrate          # creates local sqlite.db (gitignored)
pnpm db:seed             # optional sample data
pnpm dev                 # Next.js on :3005 + skill-check server on :7483
```

- **Lint:** `pnpm lint`
- **Conventions:** [CLAUDE.md](./CLAUDE.md)

## Environment

```bash
cp .env.example .env
# edit .env — values are not committed
```

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | CRM AI features (summaries, next actions, enrichment) via OpenRouter |

Without it, the UI still loads; AI mutations fail at runtime.

## Where to look (show notes)

| Doc / path | What it’s for |
|------------|----------------|
| [docs/references/hooks-architecture.md](./docs/references/hooks-architecture.md) | Hook architecture, skill-check server, recursion story |
| [CLAUDE.md](./CLAUDE.md) | Stack, MVP rules, agent harness notes |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | CRM domain and layers |
| [docs/SECURITY.md](./docs/SECURITY.md) | MVP posture (no auth) |
| `src/server/routers/` | tRPC API |
| `src/shared/schemas.ts` | Shared Zod schemas |

## Stack (short)

Next.js 16 (App Router), React 19, TypeScript, tRPC, Drizzle + SQLite, Tailwind v4, shadcn/ui — plus Bun for the hook sidecar. Details in [CLAUDE.md](./CLAUDE.md).

## License / use

Built for the podcast and experimentation; treat deployment and data as **demo-grade** unless you add auth and hardening.
