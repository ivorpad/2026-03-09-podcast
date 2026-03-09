---
name: doc-gardening
description: >
  Scan the repository's docs/ knowledge base for staleness, broken links,
  drift from code, and structural issues — then fix what's broken. Use when
  asked to "garden docs", "check docs freshness", "audit documentation",
  "fix stale docs", or on a recurring maintenance pass. Also triggers on
  "doc gardening", "docs health", "knowledge base audit".
---

# Doc Gardening

Audit the in-repo knowledge base (`docs/`, `CLAUDE.md`, `ARCHITECTURE.md`)
against the live codebase and fix issues found.

## Workflow

### 1. Run all checks

Read [references/checks.md](references/checks.md) for the full check list and output format.

Run every check in order:
1. Structural integrity — expected files exist
2. Cross-link validation — all markdown links resolve
3. Index freshness — index files list all siblings
4. Generated docs drift — db-schema.md matches schema.ts
5. QUALITY_SCORE freshness — quality entries match code
6. Exec plan hygiene — active/completed plan paths resolve
7. Stale content detection — code references in docs still exist
8. CLAUDE.md doc map sync — doc map matches reality

### 2. Produce the report

Output a structured report (format in checks.md) with severity per issue.

### 3. Fix what you can

For each issue:
- **Broken links**: Fix the path or remove the dead link
- **Missing index entries**: Add the file to the index
- **Generated docs drift**: Regenerate from source
- **Stale references**: Update or remove the outdated reference
- **Structural gaps**: Create stub files where required files are missing

Do NOT fix subjective content (prose quality, opinion on grades). Only fix
mechanical issues: links, paths, indexes, schema sync, cross-references.

### 4. Report what needs human input

List issues that require a human decision:
- Quality grades that may need updating
- Design docs with "Draft" status that may be stale
- Tech debt items that may be resolved
- Content that references removed features

## Principles

- **Fix, don't just report.** The goal is a clean docs/ after each run.
- **Minimal changes.** Don't rewrite prose. Fix links, paths, tables, indexes.
- **Preserve structure.** Follow existing formatting conventions in each file.
- **One commit.** Batch all fixes into a single commit when asked.
