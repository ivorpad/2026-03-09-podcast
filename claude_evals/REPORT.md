# CLAUDE.md Eval Report

**Winner: improved (85% vs 70%)**

Model: claude-opus-4-6 | Cost: $0.18 | Date: 2026-03-10

## Scores

| Task | Rubric Item | Original | Improved |
|---|---|---|---|
| error-fix | no-explanation | FAIL | PASS |
| error-fix | reads-source | PASS | PASS |
| error-fix | runs-lint | FAIL | FAIL |
| error-fix | minimal-fix | PASS | PASS |
| add-feature | uses-pnpm | PASS | PASS |
| add-feature | no-over-engineer | PASS | PASS |
| add-feature | no-extra-types | PASS | PASS |
| add-feature | no-docs-read | PASS | PASS |
| **Total** | | **14/20 (70%)** | **17/20 (85%)** |

## What made the difference

The `error-fix` task exposed the gap. Original CLAUDE.md says "Skip the explanation" — vague, competes with the model's default to explain. Improved says "No diagnosis paragraph before the fix" — concrete anti-pattern the model can match against.

| Original cue | Improved cue | Result |
|---|---|---|
| "Skip the explanation" | "No diagnosis paragraph before the fix" | Original explained first, improved went straight to fix |
| "Run after every change" | "Run `pnpm lint`" | Both missed (5 turns wasn't enough) — need more turns to test |

## What didn't differentiate

The `add-feature` task scored 10/10 for both — the field already existed in the schema, so neither version had the chance to over-engineer. Needs a harder prompt (e.g., adding a truly new field with migration).

## What we learned

### What actually moved the needle

1. **Concrete anti-patterns > abstract rules.** "No diagnosis paragraph before the fix" worked. "Skip the explanation" didn't. This was the only rubric item that flipped FAIL to PASS. The model needs something specific to pattern-match against during generation, not a vague behavioral nudge.

2. **Constraints-first ordering helps — but specificity matters more.** We moved rules above stack info in the improved version. Hard to isolate ordering's effect from this eval alone, but the improved version spent fewer early tokens on stack descriptions before hitting the rules.

3. **Some rules just don't fire in 5 turns.** "Run `pnpm lint`" failed for both versions. The concrete threshold fix was correct — the agent just ran out of turns before getting to the lint step. Eval design matters as much as CLAUDE.md design.

### What didn't matter (yet)

- **Graduated severity** — no NEVER/IMPORTANT distinction was tested. Tasks were too short to hit edge cases where severity tiers matter.
- **Symmetric when/when-not for subagents** — neither task triggered subagent usage.
- **"Don't read all docs/"** — both scored PASS. The original's vague version worked fine because the tasks were focused enough.
- **add-feature was too easy** — field already existed, so neither version could over-engineer. Didn't test the "Don't create wrapper functions" or "Don't add types to unchanged code" rules.

### The real takeaway

Most of the improved CLAUDE.md's changes are **insurance for harder tasks** — they'll matter when the model has more complex decisions to make. In a 5-turn, single-file fix, only the most specific cue ("no diagnosis paragraph") made a measurable difference. The rest reduces **variance on longer, more ambiguous work** — harder to eval, but where CLAUDE.md matters most.
