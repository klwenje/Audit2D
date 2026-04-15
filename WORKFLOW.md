# Agentic Workflow

## Summary

Audit Desk Retro uses a standing **3-track sprint workflow**.

Each implementation round is designed to:

1. split the work into three non-overlapping tracks
2. run those tracks concurrently
3. integrate and normalize the work in the main thread
4. run verification
5. ship a concise summary before the next round begins

This is the default operating model unless the round is too tightly coupled to parallelize safely.

## Default Sprint Design

- `Track 1`: learning systems or scoring/debrief
- `Track 2`: content/case expansion or variation
- `Track 3`: UX/game shell/progression

The main thread is responsible for:

- defining ownership boundaries
- reviewing landed changes
- resolving overlap or merge tension
- preserving save compatibility and flow coherence
- running verification
- summarizing the shipped round

## Parallelization Rules

Use concurrency only when write scopes are clearly disjoint.

Keep tightly coupled refactors local when they affect:

- Zustand store shape
- save/hydration logic
- shared types or schemas
- core scene flow where naming and behavior must land together

For content-heavy rounds:

- keep one content worker per catalog family or JSON cluster
- avoid multiple workers editing the same case catalog in parallel

## Round Structure

### Phase A: Grounding

- inspect the current repo state
- review the touched scenes, store, utils, and docs
- define the 3 tracks and ownership boundaries

### Phase B: Parallel Execution

- give each worker a bounded slice
- assign explicit file or subsystem ownership
- require each worker to adapt to live repo state
- require a successful `npm run build` before the worker closes its slice

### Phase C: Integration

- review each landed slice
- resolve duplicated concepts or partial overlaps
- normalize terminology, UI tone, and player flow
- ensure the round feels like one feature pass rather than stitched fragments

### Phase D: Verification

- run `npm run build` every round
- run additional targeted checks only when the round touches a subsystem that needs them

### Phase E: Checkpoint

- summarize what shipped
- explain why it matters to the sim
- recommend the next strongest 3-track round

## Default Product Priority

The workflow optimizes for **study usefulness first**.

Priority order:

1. adaptive learning value
2. replay value and case variation
3. progression clarity
4. immersion and polish
5. raw scenario count

## Success Criteria

The workflow is successful when it:

- increases throughput without creating merge churn
- preserves project coherence across rounds
- ends each round with a successful `npm run build`
- consistently advances the simulator toward stronger study value
