# CLAUDE.md

- Use `pnpm` (alias `pp`) as package manager
- We use tRPC for services
- We use Zod for schema validation

## MVP Rules
- Never over-engineer. No Redis, caches, or premature abstractions for MVP
- No backward compatibility — this is a pre-users MVP, just refactor directly
- No migration/compat code, no feature flags, no shims

## Workflow
- Run after every change (tests, dev server, etc.) port: 3005
- When an error is pasted, read the source → fix it → run it. Skip the explanation
- "commit and push" is a single atomic action
- When a screenshot is provided, find the visual bug and fix the code. Don't describe what you see