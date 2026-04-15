# Audit2D Agent Workflow

This repo uses a standing **3-track sprint** workflow by default.

## Default Round Shape

1. Ground in the current repo state.
2. Split the round into three non-overlapping tracks.
3. Run those tracks concurrently when the write scopes are cleanly separated.
4. Integrate in the main thread.
5. Run `npm run build`.
6. Summarize what shipped and what should come next.

## Default Track Types

- `Learning track`: scoring, coaching, remediation flow, control coverage, study feedback
- `Content track`: new case families, evidence ambiguity, seeded variants, replay depth
- `Progression track`: portfolio history, mastery systems, career progression, dossier views

## Integration Rules

- The main thread owns final integration, naming consistency, save compatibility, and verification.
- Do not run parallel workers on tightly coupled store/schema/save changes unless ownership is explicitly split.
- Keep content work isolated to one worker when multiple workers would touch the same case catalog or JSON family.
- Workers must adapt to live repo state and must not revert unrelated edits.

## Product Priority

Optimize for **study usefulness first**.

When there is a tradeoff, prioritize:

1. better learning feedback
2. stronger replay value
3. coherent progression
4. visual polish
5. raw content volume

## Acceptance Criteria Per Round

- no unresolved ownership conflicts in touched files
- successful `npm run build`
- concise shipped summary with recommended next step

## When Not To Use 3 Tracks

Collapse to 2 tracks or keep work local when:

- the change is architecture-heavy
- the same store/types/save files would be edited by multiple workers
- the feature is too small to justify delegation
- merge risk is higher than the time saved
