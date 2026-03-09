# Claude Agent SDK Gotchas

## `query()` spawns a real `claude` process
The agent SDK's `query()` spawns an actual Claude Code child process. This means:
- It inherits the current process's env vars
- It loads project `.claude/` config from `cwd` (hooks, settings, skills, CLAUDE.md)
- It can trigger hooks defined in the project

## CLAUDECODE env var causes silent failures
When running `query()` from inside an active Claude Code session, the child process detects `CLAUDECODE=1` (and other `CLAUDE_*` vars) and exits silently with code 1.

**Fix:** Strip all `CLAUDE*` env vars:
```typescript
env: Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith("CLAUDE"))
),
```

## `settingSources` controls what config loads
- Default: `[]` — NO settings loaded (no hooks, no CLAUDE.md, no skills)
- `['project']` — loads project settings INCLUDING hooks → recursion risk
- For skill-check, use `[]` and have the agent read skill files manually via tools

## `settings` option is flag-level override, not replacement
Passing `settings: { hooks: {} }` does NOT prevent project hooks from loading — it's an additional layer on top. Project hooks still fire.

## `claude -p` has the same recursion problem
Before the server approach, we tried `claude -p` which also spawns a process that loads hooks → infinite loop. Even `env -i` didn't reliably prevent it.

## `ai-sdk-provider-claude-code` also shells out
The `ai-sdk-provider-claude-code` npm package wraps `claude` CLI under the hood — same recursion risk as calling `claude -p` directly.

## `@anthropic-ai/sdk` (raw API) needs ANTHROPIC_API_KEY
The base Anthropic SDK calls the HTTP API directly (no recursion) but requires an API key. The agent SDK uses the Claude Code subscription (no key needed) but spawns a process.

## Working approach: bun+hono server
Run a persistent server that the hook curls. The server calls `query()` with:
- `env` stripped of `CLAUDE*` vars
- `settingSources: []` (default, no project settings)
- `allowedTools: ["Bash", "Read", "Glob"]`
- `permissionMode: "bypassPermissions"` + `allowDangerouslySkipPermissions: true`
- Agent reads git diff and skills manually via its tools

Cost: ~$0.07 per check, ~11 turns with Haiku.
