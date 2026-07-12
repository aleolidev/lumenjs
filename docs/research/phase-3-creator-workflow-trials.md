# Phase 3 creator-workflow trials

Trial date: 2026-07-12.

These trials inspect the current repository as a creator product. They do not
treat First Light's internal shapes as settled APIs and do not authorize a
visual editor.

## Method

The baseline journey is the nine-step journey in
`phase-3-creator-workflow-research-plan.md`. The clean-room actor may read the
README and run package scripts, but may not copy First Light or edit `src/`.
Static reference searches and disposable transformations supplement the manual
walkthrough. Repository state on the trial date is authoritative.

## Trial A: clean-room reconstruction

### Observed path

There is no project-creation command, standalone validator, focused-playtest
entry, refactor command, localization source, or project-scoped export command.
The only documented start path launches First Light itself.

A creator must infer and hand-author at least six coordinated source documents
for the two-map baseline: manifest, primary Tiled map, primary world metadata,
campaign data, secondary Tiled map, and secondary world metadata. They must
also infer filenames, JSON schema constraints, stable object types, cross-map
references, and fixture-specific minimum roster sizes by reading production
source or copying the fixture. That violates the target constraint before a
clean-room campaign can reach first render.

### Result

The journey is not currently completable without internal knowledge. The first
creator-facing increment must provide discoverable scaffolding and validation;
adding more runtime mechanics would not remove the observed blocker.

## Trial B: safe refactor

Static rename rehearsal covered one map, spawn, creature, dialogue node, and
encounter. Current text references show:

- map identifiers occur across creator sources, migration logic, Node tests,
  browser tests, and renderer defaults;
- representative creature/move identifiers occur across campaign data,
  replays, a save fixture, simulation tests, and browser tests; and
- 72 fixture-name references exist in `src` alone for the searched First Light
  names and IDs.

No project-owned reference graph, dry-run rename, migration preview, or backup
exists for source files. IndexedDB backup semantics cannot protect creator
documents. A safe rename therefore requires a separate creator-source
transaction with a preview and filesystem backup, not reuse of runtime saves.

## Trial C: external Tiled boundary

Tiled already owns geometry, layers, objects, coordinates, rectangles, and map
dimensions. Lumen metadata owns gameplay meaning and stable links. The observed
failures are discoverability and cross-file reference safety, not missing map
drawing capability.

The least-cost trial is therefore:

1. scaffold valid Tiled JSON placeholders and Lumen metadata together;
2. validate object names/types and cross-map targets from one command;
3. report both the Lumen pointer and implicated Tiled object; and
4. open a focused playtest without changing the external map source.

No evidence justifies an integrated map editor or replacing Tiled.

## Trial D: representation and localization

Plain JSON produces readable diffs and works with the existing Ajv boundary,
but the current schemas embed fixture mechanics:

- primary worlds require a beacon, bridge, character, and trail transition;
- campaigns require exactly the First Light-style inventory and at least three
  creatures;
- party-aware interior text names Glintail in the field itself; and
- simulation/UI code names Mira, Glintail, Sunberry, and First Light behavior.

Schema-aware editing can materially help IDs, references, enums, required
fields, and localized message keys. It cannot make these fixture assumptions a
standard preset. Localization should be a validated project-owned message
catalog referenced by stable keys; runtime code should receive resolved text.
This requires a second authored campaign trial before the catalog shape is
public.

## Measurements

| Measure | Current result | Interpretation |
| --- | ---: | --- |
| Supported clean-room journey steps | 0/9 end-to-end | No creator entry point exists. |
| Required coordinated source documents | 6 minimum | Scaffolding has clear value. |
| Fixture references in `src` search | 72 | Runtime is not a general preset. |
| Creator-facing validation command | 0 | Highest-priority gap. |
| Focused playtest entry points | 0 | Full fixture is the only entry. |
| Safe source refactor operations | 0 | Needs preview plus backup research. |
| External map editors already available | 1 (Tiled) | Keep the boundary. |
| Existing deterministic validation/replay layers | 1 | Reuse behind a CLI, not as public shapes. |

## Decision-gate answers

1. Automate directory creation, manifest/source templates, dependency-free
   placeholder Tiled maps, provenance stub, validation, and static export.
2. Schema assistance benefits IDs, references, enums, localized message keys,
   and required source ownership. Geometry remains in Tiled.
3. Creator diagnostics need a stable error code, source, JSON pointer, offending
   value, related source/object, and a concise remedy.
4. Map/spawn and dialogue-node starts are the first focused playtest candidates;
   their value must be measured in the clean-room fixture.
5. Map, spawn, creature, dialogue, encounter, and locale-key renames require a
   reference preview and creator-source backup.
6. Localization needs project-owned catalogs and validated keys, not translated
   strings embedded in runtime code.
7. A standard preset may provide file layout, conservative defaults, commands,
   and diagnostics. Project content and mechanic choices remain explicit.
8. No runtime/editor module pair yet has two real consumers. The first pair is
   deferred until the clean-room fixture exercises the same boundary as First
   Light without fixture-name branching.

## Research conclusion

Authorize a Phase 3A creator-foundation increment: a small Node CLI for
scaffolding, validation, machine-readable diagnostics, and reproducible static
export, plus a wholly original clean-room fixture that consumes it. Continue to
defer visual editing, refactors, localization implementation, and module
contracts until the second fixture makes their shared needs concrete.
