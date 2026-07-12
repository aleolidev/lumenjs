# Phase 2B campaign-continuity retrospective

Date: 2026-07-11.

## Outcome

First Light now proves deterministic campaign continuity across two validated
maps, browser sessions, and one real project-version migration. Active map,
visited states, position, flags, party, inventory, outcome, and dialogue meaning
survive local and portable saves.

The work remains fixture-owned. Map metadata, continuity state, save envelopes,
IndexedDB records, migrations, and UI controls are evidence, not public APIs.

## Boundaries to keep

- Resolve every map, spawn, transition, and dialogue reference before state.
- Keep Phase 2A semantics intact behind a small multimap coordinator.
- Hash canonical snapshot meaning while excluding timestamps and storage data.
- Require the save producer to satisfy the same envelope structure as the
  importer; never manufacture a locally invalid artifact.
- Treat the snapshot hash as integrity evidence, not semantic evidence; validate
  every nested deterministic state shape and authored reference after hashing.
- Validate and migrate imports in memory before replacement.
- Treat replacement preview as a complete input boundary: background gameplay
  is inert and every dismissal path clears pending destructive state.
- Claim pending destructive state synchronously before awaiting storage, so a
  second confirmation cannot begin another commit.
- Disable destructive-preview controls and suppress modal cancellation while a
  claimed commit is in flight; cancellation cannot truthfully undo that write.
- Terminate every async storage control at a UI error boundary that updates both
  diagnostics and the live region; event listeners must not leak rejections.
- Preserve storage and renderer resources across BFCache entry, but keep the
  lifecycle listener active so a later non-persisted exit closes them exactly
  once after restoration.
- Register each migration against an exact proven source project version; a
  format name alone is not migration authority.
- Commit immutable generation and pointer in one IndexedDB transaction.
- Validate and normalize the complete envelope before opening that write
  transaction; recovery is not a substitute for rejecting invalid new data.
- Retain pointer history for missing, corrupt, or invalid current generations.
- Base retention cleanup on the current pointer inside its transaction, never
  on history captured by an older overlapping save.
- Never report post-commit retention maintenance as a failed save; surface it as
  deferred cleanup while preserving the committed generation.
- Keep storage outside deterministic actions and replays.
- Render only the active resolved world and map state.

## Boundaries to revisit

- Test a second independent multimap campaign before settling creator shapes.
- Test another migration before defining a compatibility policy or registry.
- Give multiple slots, cloud ownership, and conflicts explicit requirements.
- Test richer authored conditions before designing a general event model.
- Measure larger campaigns and quota pressure before changing retention.

## Boundaries to avoid

- Do not publish current save, storage, map, dialogue, or campaign shapes.
- Do not introduce cloud sync, service workers, merging, or accounts.
- Do not infer editor architecture from this hand-authored fixture.
- Do not split the package or add a general event language.

## Next product decision

Phase 3 should begin with creator-workflow research: observe how a new creator
scaffolds, edits, validates, diagnoses, migrates, and exports a small original
campaign without changing engine internals. Start with a reviewed specification
and workflow evidence, not runtime architecture.
