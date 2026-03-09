# Architecture

## Domain Model

Three core entities with relationships:

```
Companies ──< Contacts ──< Deals
   1:N            1:N
```

- A **Company** has many Contacts and many Deals
- A **Contact** belongs to one Company, has many Deals
- A **Deal** belongs to one Contact and one Company

## Layer Map

```
src/
├── db/              # Data layer — Drizzle schema + SQLite connection
│   ├── schema.ts    # Single source of truth for DB tables
│   ├── index.ts     # DB connection singleton
│   └── migrate.ts   # Push schema to SQLite
├── shared/          # Shared types — used by both client and server
│   └── schemas.ts   # Zod schemas for all entities + AI outputs
├── server/          # API layer — tRPC routers
│   ├── trpc.ts      # tRPC init (router, publicProcedure)
│   └── routers/     # One router per entity + AI router
│       ├── index.ts
│       ├── contacts.ts
│       ├── companies.ts
│       ├── deals.ts
│       └── ai.ts
├── lib/             # Client utilities
│   ├── trpc.ts      # tRPC React client
│   ├── utils.ts     # cn() helper
│   └── ai.ts        # Anthropic SDK wrapper (generateStructuredOutput)
├── components/      # React components
│   ├── ui/          # shadcn/ui primitives
│   ├── contacts/    # Contact-specific components
│   ├── companies/   # Company-specific components
│   ├── deals/       # Deal-specific components
│   ├── app-sidebar.tsx # App navigation sidebar
│   └── providers.tsx   # tRPC + React Query + Theme providers
└── app/             # Next.js App Router pages
    ├── layout.tsx    # Root layout (sidebar + main)
    ├── page.tsx      # Dashboard
    ├── contacts/
    ├── companies/
    ├── deals/
    └── api/trpc/     # tRPC HTTP handler
```

## Dependency Rules

Dependencies flow downward only:

```
Pages (app/) → Components → lib/
                    ↓
              Server (routers) → DB + Shared Schemas
```

- `shared/schemas.ts` is imported by both client and server — no server-only code here
- `db/schema.ts` is server-only — never import from client components
- `lib/ai.ts` is server-only — called exclusively from `server/routers/ai.ts`
- UI components never call the database directly

## AI Harness Pattern

AI features follow a consistent pattern:

1. **Gather context** — query DB for the entity and related data
2. **Build prompt** — construct a specific prompt with the gathered context
3. **Call LLM** — use `generateStructuredOutput()` with a Zod schema
4. **Validate output** — Zod schema parses and validates the AI response
5. **Return/store** — either store (summary, next-action) or return without storing (enrichment)

The Zod schema IS the harness — it constrains AI output to a known, type-safe shape.

## Database

SQLite via better-sqlite3 (synchronous). Schema defined in Drizzle ORM.

- All tables use auto-increment integer IDs
- Timestamps stored as ISO text via `datetime('now')`
- Foreign keys: `contacts.companyId → companies.id`, `deals.contactId → contacts.id`, `deals.companyId → companies.id`
- AI fields (`aiSummary`, `aiNextAction`) store JSON as text

See [docs/generated/db-schema.md](./docs/generated/db-schema.md) for the full schema reference.
