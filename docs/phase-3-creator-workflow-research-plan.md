# Phase 3 creator-workflow research plan

Status: research completed after the verified Phase 2B completion audit on
2026-07-11. This document retains the opening plan and does not authorize editor
or runtime architecture. Outcomes are recorded in
`research/phase-3-creator-workflow-trials.md`,
`phase-3-creator-workflow-completion-audit.md`, and
`phase-3-creator-workflow-retrospective.md`.

## Product question

Can a new creator build, diagnose, migrate, and export a small original
multimap creature-RPG campaign without editing LumenJS internals, while keeping
the external Tiled workflow viable?

## Evidence carried forward

Phase 1 proved external Tiled geometry, typed Lumen metadata, source-linked
validation, deterministic simulation, and WebGPU rendering. Phase 2 proved an
authored dialogue/battle/recruitment loop. Phase 2B proved multimap continuity,
generational recovery, portable saves, and migration.

None of their fixture shapes is automatically a public authoring contract.
Phase 3 must distinguish stable creator needs from incidental First Light data.

## Target creator journey

The research baseline follows one new creator from an empty directory to a
static web export:

1. create an original project with a coherent standard preset;
2. add two Tiled maps and connect named spawns in both directions;
3. author creatures, dialogue, one quest-like goal, and one encounter;
4. launch a focused playtest at a chosen map or conversation;
5. understand and fix one structural and one semantic validation failure;
6. inspect campaign state and the facts caused by an action;
7. make a safe data refactor with migration and backup;
8. add a second locale without embedding translated text in runtime code; and
9. produce a static web build whose project data and provenance are auditable.

## Research trials

### Trial A: clean-room reconstruction

Give a creator the product documentation and current supported tools, but no
First Light source files. Record every manual file creation, copied identifier,
context switch, failed command, and error-recovery step needed to reproduce the
target journey with wholly original content.

### Trial B: First Light refactor

Rename one map, spawn, creature, dialogue node, and encounter in a disposable
copy. Measure which references can be found, validated, migrated, and backed up
without hidden runtime knowledge. Do not change production shapes during this
trial.

### Trial C: Tiled boundary

Compare the current external Tiled workflow with only the smallest possible
Lumen-side assistance: project scaffolding, stable-object diagnostics, and
focused playtest entry. An integrated map editor is justified only if observed
failures cannot be addressed coherently at that boundary.

### Trial D: authoring representation

Prototype the same small dialogue, quest-like goal, encounter, and creature in
plain JSON plus schema-aware tooling. Evaluate discoverability, diff quality,
reference safety, localization, and migration. This trial may produce throwaway
tools or notes, not production editor architecture.

## Measurements

- time and number of steps to first rendered map and first playable loop;
- count of identifiers copied manually and broken references introduced;
- percentage of failures with source, pointer, offending ID, and useful remedy;
- time to enter a focused playtest and reproduce a reported state;
- files and concepts touched by each safe rename;
- backup and recovery result for every destructive transformation;
- diff readability for authored content and generated output;
- static export size, validation result, provenance coverage, and offline-host
  assumptions; and
- accessibility of the workflow without relying solely on visual inspection.

## Decision gates

Phase 3 implementation must not begin until research can answer:

1. Which minimum project-creation steps are repeated and safe to automate?
2. Which fields benefit materially from schema-aware editing?
3. Which diagnostics need creator-facing remedies beyond JSON pointers?
4. What focused playtest entry points reduce iteration time measurably?
5. Which rename/refactor operations require migration and backup semantics?
6. Does localization require new source ownership or only a validated layer?
7. What belongs in a standard preset, and what remains explicit project data?
8. Does any boundary have two real consumers sufficient to justify the first
   runtime/editor module pair?

## Candidate acceptance criteria for the later specification

- A clean-room creator completes the target journey without editing `src/`.
- All creator sources validate structurally and semantically before playtest.
- Diagnostics identify source, pointer, offending reference, and next action.
- Focused playtests remain deterministic and do not mutate the project source.
- Destructive refactors preview their changes and create recoverable backups.
- Static export contains only declared project assets and reproducible output.
- The Tiled workflow remains supported unless Trial C disproves its adequacy.
- No module, editor, quest, localization, or preset shape becomes public from a
  single trial.

## Explicitly deferred during research

A built-in map editor, visual scripting, a general event language, plugin API,
package split, public module contracts, cloud collaboration, accounts, asset
marketplace, operated publishing, and replacement of Tiled are not authorized.

## Historical next step (completed)

The planned disposable clean-room campaign and written Trial A observation log
were completed and informed the reviewed Phase 3 implementation specifications.
