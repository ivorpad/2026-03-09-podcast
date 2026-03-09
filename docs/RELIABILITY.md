# Reliability

## Error Handling

- tRPC errors propagate to the client via React Query's `error` state
- AI calls can fail (API errors, malformed JSON) — caught in `generateStructuredOutput`
- Toast notifications via `sonner` for user-facing feedback

## Data Integrity

- Foreign keys enforced at the SQLite level
- Zod validation on all inputs (create/update schemas)
- AI outputs validated through Zod schemas before storage
- `updatedAt` timestamps set on every mutation

## Known Gaps

- No retry logic for AI API calls
- No rate limiting on mutations
- No optimistic updates (mutations wait for server response)
- No global error boundary component
- Deleting a company doesn't cascade to contacts/deals (FK allows null)
