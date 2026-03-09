# Codex Execution Plans (ExecPlans)

An ExecPlan is a design document that a coding agent can follow to deliver a working feature or system change. The reader is a complete beginner to this repository: they have only the current working tree and the single ExecPlan file you provide. There is no memory of prior plans and no external context.

CRITICAL: An ExecPlan that compiles but does nothing meaningful is a failure. The bar is: a stateless agent — or a human novice — reads the ExecPlan from top to bottom and produces a working, observable result. SELF-CONTAINED, SELF-SUFFICIENT, NOVICE-GUIDING, OUTCOME-FOCUSED.

## Non-Negotiable Requirements

These are hard constraints. Violating any one of them makes the ExecPlan unusable.

- Every ExecPlan MUST be fully self-contained. Self-contained means it contains ALL knowledge and instructions needed for a novice to succeed — in its current form, not after reading other docs.
- Every ExecPlan MUST produce a demonstrably working behavior, not merely code changes to "meet a definition." If a user cannot see something new happening, the plan failed.
- Every ExecPlan MUST define every term of art in plain language or not use it. "Middleware", "RPC gateway", "filter graph" — define it immediately and name the files where it manifests in this repository.
- Every ExecPlan MUST enable a complete novice to implement the feature end-to-end without prior knowledge of this repo.
- Every ExecPlan is a living document. Contributors MUST revise it as progress is made, as discoveries occur, and as design decisions are finalized. Each revision must remain fully self-contained.

## Anti-Patterns — What Bad ExecPlans Look Like

These are specific failure modes. If your ExecPlan matches any of these, rewrite it.

**The Letter-of-the-Law Plan.** Describes changes so narrowly that the resulting code compiles but does nothing meaningful. Says "add a HealthCheck struct" instead of "after starting the server, navigating to /health returns HTTP 200 with body OK." Fix: anchor every section with observable behavior a human can verify.

**The Jargon Plan.** Uses "as defined previously" or "according to the architecture doc" instead of embedding the explanation. References terms like "daemon" or "middleware" without defining them. Fix: if you introduce a phrase that is not ordinary English, define it immediately and name the files where it appears.

**The Decision-Outsourcing Plan.** Leaves ambiguous choices to the reader: "pick an appropriate data structure", "use a suitable pattern." Fix: resolve ambiguity in the plan itself and explain why you chose that path.

**The Code-Only Plan.** Lists file edits without explaining what the user can DO after the change or how to verify it works. Fix: start with purpose and observable outcomes before any code.

**The Stale Plan.** Progress section says "completed" but the concrete steps still show the original plan, not what actually happened. Fix: update ALL sections when anything changes — progress, steps, artifacts, validation.

**The Copy-Paste Plan.** Points to external blogs, docs, or prior plans without embedding the needed knowledge. Fix: if knowledge is required, embed it in the plan itself in your own words.

## How to Use ExecPlans

When **authoring** an ExecPlan: follow this document to the letter. If it is not in your context, re-read the entire file. Be thorough in reading and re-reading source material. Start from the skeleton and flesh it out as you do your research.

When **implementing** an ExecPlan: do not prompt the user for "next steps"; simply proceed to the next milestone. Keep all sections up to date. Add or split entries in the progress list at every stopping point to affirmatively state progress made and next steps. Resolve ambiguities autonomously. Commit frequently.

When **discussing** an ExecPlan: record decisions in the Decision Log; it should be unambiguously clear why any change to the specification was made.

When **researching** a design with significant unknowns: use milestones to implement proof of concepts and "toy implementations" that validate feasibility. Read the source code of libraries by finding or acquiring them. Research deeply. Include prototypes to guide a fuller implementation.

## Writing Guidelines

### Purpose and Intent Come First

Begin by explaining, in 2-3 sentences, why the work matters from a user's perspective: what someone can do after this change that they could not do before, and how to see it working. Then guide the reader through the exact steps to achieve that outcome.

### Anchor with Observable Outcomes

State what the user can do after implementation, the commands to run, and the outputs they should see. Acceptance MUST be phrased as behavior a human can verify:

Good: "After starting the server, navigating to http://localhost:8080/health returns HTTP 200 with body OK."
Bad: "Added a HealthCheck struct."

If a change is internal, explain how its impact can still be demonstrated — for example, by running tests that fail before and pass after.

### Specify Repository Context Explicitly

Name files with full repository-relative paths. Name functions and modules precisely. Describe where new files should be created. If touching more than 3 areas, include an orientation paragraph explaining how those parts fit together. When running commands, show the working directory and exact command line.

### Be Idempotent and Safe

Write steps so they can be run multiple times without causing damage or drift. If a step can fail halfway, include how to retry or adapt. If a migration or destructive operation is necessary, spell out backups or safe fallbacks.

### Validation is Not Optional

Include instructions to run tests, to start the system if applicable, and to observe it doing something useful. Include expected outputs and error messages so a novice can tell success from failure. State the exact test commands appropriate to the project's toolchain and how to interpret their results.

NEVER write a plan without a validation section. If you cannot describe how to verify the change works, the plan is incomplete.

### Write in Plain Prose

Prefer sentences over lists. Avoid checklists, tables, and long enumerations unless brevity would obscure meaning. Checklists are permitted ONLY in the Progress section, where they are mandatory. Narrative sections must remain prose-first.

### Capture Evidence

When your steps produce terminal output, short diffs, or logs, include them as indented examples within the plan. Keep them concise and focused on what proves success.

## Milestones

Milestones are narrative, not bureaucracy. If you break the work into more than 1 milestone, introduce each with a brief paragraph that covers: the scope, what will exist at the end that did not exist before, the commands to run, and the acceptance you expect to observe.

Each milestone MUST be independently verifiable and incrementally implement the overall goal. Never abbreviate a milestone merely for brevity — do not leave out details that could be crucial to a future implementation.

It is acceptable — and often encouraged — to include explicit prototyping milestones when they de-risk a larger change. Keep prototypes additive and testable. Clearly label the scope as "prototyping"; describe how to run and observe results; and state the criteria for promoting or discarding the prototype.

## Living Document Sections

ExecPlans MUST contain and maintain these four sections. They are not optional.

**Progress** — A checklist summarizing granular steps. Every stopping point must be documented here, even if it requires splitting a partially completed task into two. Use timestamps. This section must always reflect the actual current state.

**Surprises & Discoveries** — Unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Include concise evidence (test output is ideal).

**Decision Log** — Every design decision made while working, with rationale. If you change course mid-implementation, document why here and reflect the implications in Progress.

**Outcomes & Retrospective** — At completion of a major task or the full plan, summarize what was achieved, what remains, and lessons learned. Compare the result against the original purpose.

When you revise a plan, MUST ensure changes are comprehensively reflected across ALL sections. Write a note at the bottom describing the change and why.

## Formatting

Each ExecPlan must be one single fenced code block labeled as `md` that begins and ends with triple backticks. Do not nest additional triple-backtick code fences inside; when you need to show commands, transcripts, diffs, or code, present them as indented blocks within that single fence.

When writing an ExecPlan to a Markdown file where the content IS the ExecPlan, omit the triple backticks.

Use two newlines after every heading. Use # and ## and so on. Use correct syntax for ordered and unordered lists.

## Skeleton

    # <Short, action-oriented description>

    This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
    Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

    Maintained in accordance with PLANS.md at the repository root.

    ## Purpose / Big Picture

    Explain in 2-3 sentences what someone gains after this change and how they can see it
    working. State the user-visible behavior you will enable.

    ## Progress

    - [x] (2025-10-01 13:00Z) Example completed step.
    - [ ] Example incomplete step.
    - [ ] Example partially completed step (completed: X; remaining: Y).

    ## Surprises & Discoveries

    - Observation: ...
      Evidence: ...

    ## Decision Log

    - Decision: ...
      Rationale: ...
      Date/Author: ...

    ## Outcomes & Retrospective

    Summarize outcomes, gaps, and lessons learned at major milestones or at completion.

    ## Context and Orientation

    Describe the current state as if the reader knows nothing. Name the key files and
    modules by full path. Define any non-obvious term. Do not refer to prior plans.

    ## Plan of Work

    Describe, in prose, the sequence of edits and additions. For each edit, name the file
    and location (function, module) and what to insert or change. Keep it concrete.

    ## Concrete Steps

    State the exact commands to run and where (working directory). When a command generates
    output, show a short expected transcript. Update this section as work proceeds.

    ## Validation and Acceptance

    Describe how to exercise the system and what to observe. Phrase acceptance as behavior
    with specific inputs and outputs.

    ## Idempotence and Recovery

    Can steps be repeated safely? If a step is risky, provide a retry or rollback path.

    ## Artifacts and Notes

    Include the most important transcripts, diffs, or snippets as indented examples.

    ## Interfaces and Dependencies

    Name the libraries, modules, and services to use and why. Specify the types and function
    signatures that must exist at the end. Prefer stable names and paths.

## Quality Checklist

Before delivering any ExecPlan, verify:

- Does it start with purpose and observable outcomes before any code?
- Can a novice who has never seen this repo follow it end-to-end?
- Is every term of art defined at first use?
- Are there specific commands to run with expected output?
- Does the validation section describe behavior, not internal attributes?
- Are all four living document sections present and current?
- Does it resolve ambiguities instead of deferring to the reader?
- If it references knowledge, is that knowledge embedded — not linked?
- Could it be run a second time without causing damage?
- Does every milestone have independent verification?
