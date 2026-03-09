# CLAUDE.md

<!-- PATRÓN: La identidad va en una línea. El modelo infiere el resto.
     No escribas un currículum — escribe una palabra clave. "CRM" + "AI features"
     le dice al modelo todo sobre el dominio sin gastar tokens. -->
CRM demo app with AI-powered contact enrichment, deal tracking, and summaries.

<!-- PATRÓN: Restricciones antes que capacidades (Patrón cruzado #2).
     El modelo se ancla en el contenido temprano. Si ve tu stack primero,
     ya está generando código antes de llegar a tus reglas.
     Pon las reglas PRIMERO para que coloreen todo lo que viene después. -->

## Rules

<!-- PATRÓN: Severidad graduada (#7).
     No todo puede ser CRITICAL. Tres niveles:
     - Sin marca = guía (se puede flexibilizar)
     - IMPORTANT = fuerte (debería seguirse)
     - NEVER/MUST = restricción dura (no se puede violar)
     Si todo grita, nada grita. -->

- NEVER start or stop the dev server — user manages server lifecycle
- NEVER run `npm`. Use `pnpm` (alias `pp`) for everything
- When fixing a pasted error: read source, fix, run `pnpm lint`. No diagnosis paragraph before the fix
- When a screenshot is provided: diff against the component, fix the markup/CSS, run `pnpm lint`
- When user says "commit and push": stage, commit, push in one sequence. Don't ask between steps

<!-- PATRÓN: Ejemplos negativos > reglas positivas (Patrón cruzado #1).
     "No sobre-ingeniería" es vago — mis priors de entrenamiento compiten.
     En vez de eso, lista las cosas ESPECÍFICAS que realmente hago mal.
     El modelo puede hacer pattern-match contra fallos concretos mientras genera. -->

### Don't

- Don't add error handling for scenarios that can't happen in a SQLite/local app
- Don't create wrapper functions used in only one place
- Don't add TypeScript types or comments to code you didn't change
- Don't add backward-compat shims, re-exports, or deprecation wrappers — delete old code directly
- Don't read all of `docs/` upfront. Read a doc only when the task touches that domain

<!-- PATRÓN: Umbrales concretos (Patrón cruzado #3).
     "Corre después de cada cambio" es vago — ¿correr qué? ¿Tests? ¿Lint? ¿Dev server?
     Dale al modelo un comando específico para que no tenga que adivinar. -->

### After Every Code Change

- Run `pnpm lint`
- If tests exist for the touched module, run them

## Stack

- **Runtime:** Next.js 16 (App Router), React 19, TypeScript 5
- **API:** tRPC v11, Zod v4
- **Database:** SQLite via Drizzle ORM (better-sqlite3)
- **UI:** shadcn/ui (Base UI), Tailwind CSS v4, Lucide icons
- **AI:** Anthropic SDK (Claude Sonnet) for structured outputs
- **Dev server:** `pnpm dev` on port 3005

## Architecture

Three entities: **Companies**, **Contacts**, **Deals**.
Three AI features: contact summary, deal next-action, contact enrichment.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full domain and layer map.

## Key Conventions

- Shared Zod schemas in `src/shared/schemas.ts` — used by both client and server
- tRPC routers in `src/server/routers/` — one per entity + `ai.ts`
- AI outputs validated through Zod schemas (structured output harness)
- All AI suggestions are human-in-the-loop: enrichment returns suggestions, doesn't auto-save

## Subagents

<!-- PATRÓN: Simétrico cuándo/cuándo-no (Patrón #3).
     Cada prompt de herramienta necesita AMBOS lados.
     Sin "cuándo NO", el modelo siempre o nunca delega. -->

See [SUBAGENTS.md](./SUBAGENTS.md) for the full workflow.

**Use subagents when:**
- Task requires exploring more than 3 files to answer
- Parallel analysis of independent components
- Reviewing AI prompt patterns across multiple routers

**Don't use subagents when:**
- You already know which file to edit
- Single grep or glob will answer the question
- Task is a straightforward bug fix in one module

## ExecPlans

For multi-step features or significant refactors, start with an ExecPlan (see [PLANS.md](./docs/PLANS.md)) before writing code.

## Documentation Map

All deep context lives in `docs/`. Read on-demand, not upfront.

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
| [docs/references/mcporter.md](./docs/references/mcporter.md) | mcporter CLI ref for MCP server interaction |

<!-- PATRÓN: Restricciones de formato / reglas duras al FINAL (Patrón cruzado #4).
     La última instrucción antes de generar tiene la mayor saliencia.
     Es lo último que el modelo "escucha" antes de ponerse a trabajar.
     Pon aquí tu restricción más dura, la que más se viola. -->

## Links

IMPORTANT: When the user pastes a URL, ALWAYS fetch it before acting. Don't guess content from the URL. If fetch fails, STOP and tell the user.
