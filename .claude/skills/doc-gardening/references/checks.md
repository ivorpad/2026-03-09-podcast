# Doc Gardening Checks Reference

## Check Details

### 1. Structural Integrity

Verify `docs/` matches the expected layout from CLAUDE.md's Documentation Map:

```
docs/
  design-docs/     (index.md required)
  exec-plans/      (tech-debt-tracker.md required)
  generated/       (db-schema.md required)
  product-specs/   (index.md required)
  references/
  DESIGN.md
  FRONTEND.md
  PLANS.md
  PRODUCT_SENSE.md
  QUALITY_SCORE.md
  RELIABILITY.md
  SECURITY.md
```

Flag: missing files, unexpected files not listed in any index.

### 2. Cross-Link Validation

For every markdown link `[text](./path)` or `[text](path)` in docs/:
- Resolve the path relative to the file containing the link
- Confirm the target file exists
- Flag broken links with file:line and the dead target

Also check CLAUDE.md's Documentation Map table — every path listed there must exist.

### 3. Index Freshness

Index files (`docs/design-docs/index.md`, `docs/product-specs/index.md`) must list every sibling `.md` file (excluding themselves).

- Flag files present on disk but missing from the index
- Flag index entries pointing to files that don't exist

### 4. Generated Docs Drift

Compare `docs/generated/db-schema.md` against `src/db/schema.ts`:
- Read schema.ts and extract table names and column names
- Read db-schema.md and extract the same
- Flag any tables or columns present in code but missing from docs (or vice versa)

### 5. QUALITY_SCORE.md Freshness

Read `docs/QUALITY_SCORE.md` and cross-check domain entries:
- Every tRPC router in `src/server/routers/` should have a corresponding quality entry
- Flag routers with no quality grade
- Flag quality entries referencing domains that no longer exist in code

### 6. Exec Plan Hygiene

- `docs/exec-plans/active/` — if directory exists, each plan should have a status line
- `docs/exec-plans/completed/` — if directory exists, plans here should NOT be listed in PLANS.md "Active Execution Plans"
- `docs/exec-plans/tech-debt-tracker.md` — should exist, flag if missing
- PLANS.md references to exec-plans paths must resolve

### 7. Stale Content Detection

For each doc in docs/ (excluding generated/ and references/):
- Extract code references: file paths, function names, component names, import paths
- Spot-check a sample (up to 5) against the actual codebase using Grep/Glob
- Flag references to files, functions, or patterns that no longer exist

### 8. CLAUDE.md Documentation Map Sync

The Documentation Map table in CLAUDE.md must match reality:
- Every path in the table must exist
- Every top-level doc in docs/ should appear in the table
- Flag mismatches in either direction

## Output Format

```markdown
## Doc Gardening Report

### Summary
- X checks passed
- Y issues found

### Issues

#### [CHECK_NAME] severity: high|medium|low
- **File:** path/to/file.md:line
- **Issue:** description
- **Fix:** suggested action

### Clean
- [CHECK_NAME]: All good
```

## Severity Guide

- **high**: Broken links, missing required files, generated docs out of sync with code
- **medium**: Index files incomplete, stale code references, quality score gaps
- **low**: Minor formatting, exec plan status lines missing
