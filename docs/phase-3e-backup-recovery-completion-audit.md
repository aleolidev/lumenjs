# Phase 3E creator-backup recovery completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Shared atomic backup store | Rename matrix passes through extracted store | Proven. |
| 2 | Deterministic newest-first list | Generation 2→1 assertions | Proven. |
| 3 | Corruption/path/symlink/hash rejection | Seventeen-case integrity matrix | Proven. |
| 4 | Inert preview | Full directory byte comparison | Proven. |
| 5 | Staged validation before apply | Restore module and invalid-generation tests | Proven. |
| 6 | Safety generation before replacement | Generation 2 operation assertion | Proven. |
| 7 | Exact successful pre-image restore | Declared-source byte comparison | Proven. |
| 8 | Forced commit rollback | Injected failure and current-source comparison | Proven. |
| 9 | CLI list/preview/apply/error behavior | CLI happy path plus missing/corrupt generation exit assertions | Proven. |
| 10 | Export excludes backups and inherited gates | 101 Node, 42 portable browser, headed GPU, build, diff check | Proven. |
| 11 | Experimental boundary | Specification and README | Proven. |
| 12 | Concurrent complete generations | Five-way atomic reservation test | Proven. |
| 13 | Supported operation records only | Forged format, invalid stable-ID/scope semantics, and unexpected operation/top-level shape cases | Proven. |
| 14 | Root diagnostics | Symlink and missing-project coded assertions | Proven. |
| 15 | Backup-owned hashes | Hash is computed from each staged pre-image before atomic publication | Proven. |
| 16 | Producer record validation | Unexpected field and changed-file/hash mismatch fail with a coded error and publish no generation | Proven. |
| 17 | Exact change-record semantics | Forged destination and unexpected change field make a hash-valid generation corrupt; direct producers use fully corresponding change records | Proven. |
| 18 | Exact generation inventory | Symlinked `files/` root, unexpected root file, backed-up file, and empty backup directory each invalidate the generation before restore | Proven. |
| 19 | Ordered safety target | A real generation-2 safety backup forged to target itself is listed corrupt and cannot restore | Proven. |
| 20 | Current declaration scope | Integrity-valid backup of an undeclared `notes.json` is refused with a stable code, preserves bytes, and creates no safety generation | Proven. |
| 21 | Current pre-image required | Removed optional context still leaves a valid project, but its valid backup cannot recreate it; stable refusal preserves absence and generation count | Proven. |
| 22 | Control-free backup paths | Corruption matrix adds an ESC-bearing hash/changed-file path, records an unsafe-path issue, and refuses restore | Proven. |
| 23 | Cross-platform backup paths | Hash-valid `aux.json` and case-colliding campaign metadata are classified unsafe/colliding and cannot restore on Unix | Proven. |
| 24 | Change-pointer preimage correspondence | All rename kinds validate reference preimages; message definitions prove old-key existence; forged shape-valid `/schemaVersion` metadata is corrupt and unrestorable | Proven. |

## Scope confirmation

Backup layout, integrity records, generation numbering, preview JSON, and restore
semantics remain experimental. Restore currently requires a valid current
project and covers tool-created changed-file pre-images; it is not a general
filesystem snapshot, merge system, or disaster-recovery service.

A later distribution-boundary review also made the “tool-created” condition
executable: unknown record formats and malformed rename/restore-safety
operations are corrupt generations even when their file hashes match. Record
and operation keys are exact, so compatible-looking extensions cannot silently
change restore metadata semantics.
Rename change entries now receive the same treatment: their sources cover the
owned changed-file set, source/pointer pairs are unique, and before/after values
must equal the operation IDs. They remain explanatory metadata, but cannot lie
while a generation is reported as integrity-valid.
Generation inspection also walks the physical tree and compares both files and
directories to the hash-derived inventory, so unowned content cannot hide beside
otherwise valid pre-images.

## Final verification

- `npm run check`: formatting, types, and 101/101 Node tests pass.
- `npm run test:browser`: 42/42 portable tests pass in Chromium, Firefox, and
  WebKit; the three GPU-only matrix entries skip as designed.
- `npm run test:gpu`: headed Chromium renders both First Light maps within the
  fixture budgets.
- `npm run build` and `git diff --check`: pass.
