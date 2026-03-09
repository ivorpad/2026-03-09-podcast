# Hooks Architecture

## Skill Check Hook
Reviews git diffs against `.claude/skills/` guidelines using sub-agents per skill.

### Components
1. **`.claude/hooks/skill-check.sh`** — Shell hook (Stop event). Curls the server. If server is down, returns `{}` (allow). Caches by diff hash. Stale locks auto-expire after 3 minutes.
2. **`.claude/hooks/skill-check-server.ts`** — Bun+Hono server on port 7483. Accepts `POST /check {cwd}`.

### How it runs
- `pnpm dev` starts both Next.js and the skill-check server concurrently
- Server gets diff once via `Bun.spawnSync`, extracts changed file paths
- **Smart skill matching**: maps changed files to relevant skills only (e.g. `.tsx` → react, `routers/` → trpc)
- Spawns one `query()` sub-agent per relevant skill (not all 7 every time)
- Concurrency limit of 2 to prevent claude process crashes
- Each sub-agent reads SKILL.md + references, reviews diff, returns VERDICT JSON
- Per-skill error handling: one crash doesn't kill the whole check

### Skill Matchers
- `typescript-best-practices` → `.ts`, `.tsx` files
- `next-best-practices` → `src/app/`, `next.config`
- `vercel-react-best-practices` → `.tsx`, `.jsx` files
- `trpc-type-safety` → `trpc`, `routers/`
- `drizzle-best-practices` → `db/`, `schema`, `drizzle`
- `shadcn` → `components/ui/`, `components.json`
- `building-components` → `components/` (not `components/ui/`)

### Why a server (not inline)
- **Recursion prevention**: `query()` spawns `claude` which loads project hooks. If the hook itself called `query()`, it would recurse infinitely.
- **Clean env**: Server strips `CLAUDE*` env vars so the child process doesn't detect a parent session.
- **Graceful degradation**: If server isn't running, hook allows everything.

### Failed approaches (in order)
1. **Python + `claude -p`** — Infinite loop. `claude -p` triggers hooks which call `claude -p`...
2. **Python + recursion guard env var** — Worked but user wanted bun, not python
3. **`ai-sdk-provider-claude-code` + `generateObject`** — Still shells out to `claude`, same recursion
4. **`@anthropic-ai/sdk` direct API** — No recursion but needs `ANTHROPIC_API_KEY` (not available)
5. **Agent SDK from this project dir** — `CLAUDECODE=1` env var caused silent exit code 1
6. **Agent SDK with `settingSources: ['project']`** — Loads project hooks → recursion
7. **Agent SDK with `settings: { hooks: {} }`** — Doesn't override project hooks, just adds a layer

### What works
Agent SDK `query()` with:
- `env`: all `CLAUDE*` vars stripped
- `settingSources`: `[]` (default — no project config loaded)
- Agent reads skills manually via file tools
- Server runs as separate process, hook just curls it

### Known issues
- Agent SDK `query()` can crash with exit code 1 when too many concurrent processes. Fixed with concurrency limit of 2 + `process.on("uncaughtException")`.
- Lock file cleanup via `trap EXIT` is unreliable when Claude Code kills the hook. Fixed with 3-minute stale lock expiry.

## Other Hooks
- **`.claude/hooks/file-size-guard.sh`** — Guards against large files
- **`~/.claude/hooks/pre-compact.sh`** — Pre-compaction context extractor (uses `claude -p`, runs in background via bun)
