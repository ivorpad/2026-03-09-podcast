# Security

## Current State (MVP)

- No authentication or authorization — single-user demo
- No CSRF protection needed (no session cookies)
- ANTHROPIC_API_KEY loaded from environment (never committed)

## Validation Boundaries

- All tRPC inputs validated via Zod schemas
- AI outputs validated via Zod schemas before storage
- SQL injection prevented by Drizzle ORM parameterized queries

## Sensitive Data

- `ANTHROPIC_API_KEY` — environment variable, never in code
- `sqlite.db` — listed in `.gitignore`, not committed; create with `pnpm db:migrate` (optional `pnpm db:seed`)
- No PII handling requirements for demo

## Future Considerations

- Add auth before any multi-user deployment
- Rate limit AI endpoints
- Sanitize user-provided notes before sending to LLM
