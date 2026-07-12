# Phase 3E creator-backup recovery specification

Status: authorized as Phase 3 hardening on 2026-07-12 from the Phase 3
retrospective. It does not broaden public contracts.

## Product question

Can a creator inspect and safely restore the immutable source generations made
by refactors, without manually copying hidden files or losing the current valid
project?

## Commands

```text
lumen backups <directory> [--json]
lumen restore <directory> --generation <number> [--apply] [--json]
```

`backups` verifies the backup root, operation record, declared changed-file
paths, regular-file ownership, and every recorded SHA-256 pre-image hash. It
reports generations newest first and never mutates the project.

`restore` defaults to preview. It requires a currently valid project and an
integrity-valid generation, stages the complete declared project with the
selected pre-images, validates the staged result, and reports file/hash changes.

With `--apply`, restore first creates a new immutable safety generation from the
current versions of every replaced file. It then replaces each file by atomic
rename within a guarded multi-file commit and performs final validation. Any
injected or real caught commit/final-validation failure restores the safety
generation; process termination is not falsely described as transactional.

Backup generation creation uses a staging directory and atomic rename. Existing
generations are never overwritten. Symlinked/non-directory `.lumen`, `backups`,
generation, or backup-file paths fail before writes.
Recorded hashes are computed from the staged backup files themselves, so every
published operation record describes the immutable bytes it owns rather than a
second read of a potentially changing source.
Concurrent creators reserve distinct hidden generation slots atomically and use
unique staging directories; incomplete staging/reservation entries are never
listed as restorable generations.

## Acceptance criteria

1. Rename uses the shared atomic backup store without behavior regression.
2. List returns deterministic newest-first generation metadata and integrity.
3. Corrupt operation JSON, unsafe paths, symlinks, missing files, and hash
   mismatch are reported and cannot restore.
4. Preview changes no project or backup byte.
5. Preview validates the overlaid project before offering apply.
6. Apply creates a safety generation before replacement.
7. Successful restore recreates the selected valid pre-image exactly.
8. Forced mid-commit failure restores byte-identical current sources.
9. CLI human/JSON output and exit codes cover list, preview, apply, missing and
   corrupt generations.
10. Static export excludes `.lumen`; inherited Node/browser/GPU/build gates pass.
11. Backup layout and restore behavior remain experimental.
12. Concurrent backup creation yields distinct complete generations.
13. Only records with a supported tool-owned format and operation shape are
    listed as valid or offered for restore.
14. Backup inspection rejects symlink/non-directory project roots and
    distinguishes a missing project from a valid project with no backups.
15. Each operation hash is derived from the staged backup file that the
    generation will own, before atomic publication.
16. The backup producer validates the exact final operation record before
    publication, including equality between changed files and owned hashes;
    unsupported, extended, or self-inconsistent shapes leave no generation.
17. Every rename `changes` entry has the exact source/pointer/before/after shape,
    names a backed-up changed file, agrees with the recorded operation IDs, and
    is unique; every changed file is represented, while restore-safety records
    own no rename changes.
18. a valid generation has an exact physical inventory: only `operation.json`
    and `files/` at its root, exactly the hash-owned regular files below it, and
    exactly the required parent directories; extra files, empty directories,
    symlinks, or unsupported file types make it unrestorable.
19. a restore-safety record targets a positive generation strictly earlier than
    its own generation; self/future targets are impossible producer states and
    make an otherwise hash-valid safety generation corrupt.
20. restore may replace only files still present in the current validated
    declaration graph; an integrity-valid generation owning an undeclared file
    fails before hash comparison, staging, safety generation, or mutation.
21. a declared but currently absent optional source is not recreated by restore:
    without a current regular readable pre-image, a reversible safety generation
    cannot be made, so preview/apply fail with a stable code and remain inert.
22. backup-owned relative paths reject Unicode control, format, line-separator,
    and paragraph-separator characters in addition to traversal/reserved
    segments, so corrupt metadata cannot inject terminal controls during
    inspection or restore diagnostics.
23. backup paths use NFC, reject platform-reserved device names, punctuation,
    and trailing dot/space, and reject case-insensitive inventory collisions on
    every host, preventing a generation accepted on one operating system from
    becoming unaddressable on another.
24. every rename change pointer resolves against its backed-up JSON source and
    identifies exactly the recorded `before` reference; a message-catalog
    definition instead proves the old key exists while retaining its translated
    value. Shape-valid but misdirected metadata makes the generation corrupt.
