# Product Sense

## What This Is

Harness CRM is a lightweight CRM for small sales teams. It demonstrates how AI features (structured outputs via Zod schemas) can augment a traditional CRUD application.

## User Mental Model

Users think in three objects:
1. **Companies** — organizations they're selling to
2. **Contacts** — people at those companies
3. **Deals** — opportunities with a value and stage

The pipeline stages map to a standard sales funnel:
`lead → qualified → proposal → negotiation → closed-won / closed-lost`

## AI as Copilot, Not Autopilot

AI features assist, never act autonomously:
- **Contact Summary:** synthesizes notes + deal history into a quick-read summary
- **Deal Next Action:** suggests what to do next based on deal stage and notes
- **Contact Enrichment:** suggests professional details — returns suggestions only, human decides what to save

This is the harness pattern: constrain AI output with Zod schemas so it's always structured, typed, and predictable.

## Design Principles

1. **Show, don't configure.** No settings pages. Sensible defaults.
2. **AI augments, human decides.** All AI outputs are suggestions. No auto-saves except for summaries (which are explicitly requested).
3. **Speed over polish.** MVP — ship fast, iterate on feedback.
4. **Data stays simple.** SQLite, no external services, no auth for now.
