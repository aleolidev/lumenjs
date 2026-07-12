# Phase 3B safe-authoring specification

Status: authorized for implementation on 2026-07-12 from Trials B and D.

## Product question

Can a creator localize prose and rename stable authored IDs across files without
silently breaking references or losing the previous valid project?

## Localization catalogs

The experimental manifest may declare a default locale and a map of locale IDs
to project-relative JSON catalogs. Catalogs own message text; campaign/world
sources own stable message keys. Every catalog must contain exactly the default
catalog's keys, all values must be non-empty strings, and no runtime code owns a
translation.

The scaffold includes original English and Spanish catalogs. Inspect reports
locale IDs, default locale, key count, and missing/extra keys. Export includes
only declared catalogs.

Inline `campaign.messages` remains accepted temporarily for Phase 3A fixtures,
but a project cannot declare both inline messages and locale catalogs.

## Safe rename

The CLI adds:

```text
lumen rename <directory> --kind <kind> --from <id> --to <id> [--map <id>] [--apply] [--json]
```

Supported kinds are `map`, `spawn`, `creature`, `dialogue`, `encounter`, and
`message`. Spawn IDs require `--map` because their namespace is map-owned.

Without `--apply`, the command validates and prints a deterministic preview of
every source/pointer change. It never writes. With `--apply`, it:

1. builds the transformation entirely in memory;
2. writes a complete staged project and validates it;
3. creates the next immutable creator backup under `.lumen/backups/`;
4. commits only the changed regular files; and
5. restores the backup automatically if commit or final validation fails.

The backup contains the changed pre-image files and an operation manifest with
kind, old/new IDs, map scope, and SHA-256 hashes. Generation numbers, not time,
order backups. The source project excludes `.lumen` from static export.

Rename refuses an invalid source project, invalid/reserved ID, absent source ID,
already-existing destination ID, ambiguous occurrence, zero-change result, or
transformation that does not validate in staging.

## Acceptance criteria

Phase 3B is complete only when:

1. scaffolded projects use project-owned English and Spanish catalogs;
2. missing, extra, invalid, unsafe, and mixed inline/catalog localization fail
   with coded source-linked diagnostics and remedies;
3. inspect and export account for every declared locale deterministically;
4. previews cover all references for every supported rename kind;
5. preview mode changes no source or backup file;
6. invalid, absent, colliding, ambiguous, and semantically broken renames are
   inert;
7. apply creates an immutable numbered backup before source replacement;
8. a forced mid-commit failure restores byte-identical source files;
9. successful apply validates and reports changed files and backup generation;
10. map/spawn/creature/dialogue/encounter/message rename tests prove reference
    coverage in the clean-room fixture;
11. static export never includes `.lumen` backups;
12. CLI human/JSON output and exit codes cover preview and apply;
13. existing Phase 3A and Phase 2B gates remain green; and
14. localization and rename formats remain experimental, not public contracts.
15. message rename updates character `messageKey` references as well as dialogue,
    quest, and every locale catalog definition; the staged project revalidates
    the complete localized reference graph before commit.
16. rename map scope is exact: spawn rename requires one valid non-reserved map
    ID, every other kind rejects a map scope, and preview/apply share this
    pre-validation before project reads, locks, backups, or writes.
17. each declared locale owns a distinct catalog source; two locale IDs cannot
    alias one JSON document and thereby create ambiguous translation/refactor
    ownership.

## Deferred

Visual editing, arbitrary JSON Patch, object-name rename inside TMJ, merge,
undo history beyond immutable backups, locale fallback chains, plural rules,
runtime locale switching, quests/trainers, focused playtest, and module
contracts remain deferred.
