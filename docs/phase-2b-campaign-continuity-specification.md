# Phase 2B campaign-continuity specification

Status: authorized for implementation on 2026-07-11.

## Product question

Can a LumenJS campaign continue across maps, browser sessions, and project
versions without losing progress or exposing the Phase 2A fixture state as a
public save contract?

Phase 2B answers this with one additional original interior, a longer
party-aware conversation, a local generational save, portable export/import,
and one real migration. The replay remains the deterministic regression oracle.

## Player fixture

After recruiting Glintail, the player enters Lantern House from Lantern Vale.
Inside, Mira recognizes the current party and records that the group is ready
for the next trail. The player saves, closes or reloads the playtest, restores
the same campaign, and can return to the Vale.

The fixture must prove:

- two maps with stable IDs and transitions in both directions;
- per-map spawn and collision semantics;
- campaign flags, party, inventory, outcome, active map, and player position
  surviving a save/load cycle;
- dialogue whose available text depends on validated party state; and
- an old save migrating to the current format without changing its meaning.

## Creator sources

The project manifest names an ordered map collection rather than assuming one
map. Each map entry names its Tiled source and Lumen-owned world metadata. Map
metadata owns stable transition IDs and targets another map plus a named spawn.

Campaign data adds the minimum party-aware dialogue needed by the fixture. A
missing map, spawn, transition target, or dialogue reference fails semantic
validation before runtime state exists.

The source shapes remain internal fixture contracts. A second multimap project
is still required before they can become public.

## Multimap runtime state

Campaign state records `activeMapId` and a world-state entry for every visited
map. Entering a map creates its state from the validated map definition only if
it has not been visited. A transition changes the active map and places the
player at the resolved target spawn.

World simulations continue to consume one validated action synchronously. The
campaign coordinator owns map changes and emits structured `map-left` and
`map-entered` facts. Rendering receives only the active resolved world and its
state.

## Save envelope

The canonical portable envelope is project-owned and versioned:

```text
lumen-save-v2
  project id and project version
  save format version
  save id and creation timestamp
  campaign snapshot
  snapshot hash
```

The snapshot contains serializable campaign meaning only. It excludes renderer
objects, GPU resources, DOM state, diagnostics, derived lookup tables, and
storage metadata. Loading validates the envelope structurally, validates the
project identity, migrates supported older formats, validates the resulting
campaign snapshot semantically, and verifies its hash before replacing runtime
state.

Timestamps describe the artifact but never affect simulation or replay hashes.

## Local generations and recovery

IndexedDB stores immutable snapshots plus one pointer per slot. Saving writes a
new generation and advances the pointer in one transaction. Each generation
records its parent and checksum. Loading walks backward from the current
generation until it finds the newest valid snapshot.

The fixture uses one slot, `journey`. It retains the newest three generations.
Retention cleanup occurs only after the new pointer commits. Logical corruption
of the newest generation must recover the previous valid generation and report
that recovery to diagnostics and the player.

Storage persistence and quota are reported as capabilities, never assumed.

## Portable export and import

Export serializes the validated current envelope to a JSON Blob and proposes a
stable filename. The baseline uses browser download; no File System Access API
dependency is required.

Import reads a user-selected JSON file. It performs all parsing, structural
validation, migration, identity checks, snapshot validation, and hash checks in
memory. Only a fully valid result may create a backup generation and replace
the local slot/runtime state. Invalid imports leave both untouched.

The UI shows a concise preview: project, source format, resulting format,
active map, party, and migration status. The player explicitly confirms a valid
replacement. This fixture has no merge operation.

## Migration fixture

`lumen-save-v1` represents the completed Phase 2A shape: one `world` state and
no explicit active-map collection. Its migration:

1. creates `activeMapId: lantern-vale`;
2. moves the old world state into `mapStates.lantern-vale`;
3. preserves mode, dialogue, party, inventory, battle, and outcome;
4. records no current wall-clock value in deterministic state; and
5. emits a migration report from version 1 to version 2.

Migration runs on a clone and never mutates the imported value. A migrated save
must produce the same logical Phase 2A state hash after projection to the old
shape.

## Diagnostics and UI

The playtest exposes:

- active map and visited maps;
- current save generation and snapshot hash;
- persisted/quota capability when available;
- last save, load, import, export, migration, or recovery result;
- source and pointer for validation failures; and
- a developer-only corruption hook used solely by browser acceptance tests.

Player controls provide Save, Load, Export, and Import. Destructive replacement
requires a preview and confirmation. Status messages use an ARIA live region
and remain usable at the existing narrow viewport.

## Replays

The Phase 2A victory and loss replays remain valid after project-version
migration or receive an explicit versioned migration fixture. A new canonical
continuity replay recruits Glintail, returns to the world, enters Lantern House,
completes the party-aware dialogue, returns to Lantern Vale, and yields a fixed
state hash and ordered facts.

Storage operations are not simulation actions and do not enter the replay.
Loading a snapshot establishes a new deterministic starting state from which
later actions may be recorded.

## Acceptance criteria

Phase 2B is complete only when:

1. both map sources and all cross-map references validate before state exists;
2. a replay crosses into and out of Lantern House with fixed facts and hash;
3. party-aware dialogue reflects Glintail without UI rule duplication;
4. save/load restores active map, position, flags, party, inventory, and outcome;
5. the local store commits snapshot and pointer atomically;
6. corruption of the newest generation recovers the previous valid generation;
7. export produces a structurally and semantically valid portable envelope;
8. invalid import changes neither runtime state nor the valid local slot;
9. valid replacement creates a recoverable backup generation;
10. the v1 fixture migrates to v2 while preserving projected Phase 2A meaning;
11. diagnostics and accessible UI explain save, migration, and recovery results;
12. Node tests cover schemas, migration, envelope/hash, multimap simulation, and
    replay without a browser;
13. Chromium, Firefox, and WebKit cover save/load, export/import, recovery, and
    narrow UI behavior;
14. the headed WebGPU lane renders both active maps without validation errors
    and remains within an explicit fixture budget;
15. production build, provenance, retrospective, and completion audit pass; and
16. no save, map, storage, or dialogue shape is declared a public API.
17. overlapping saves cannot let an older retention cleanup delete a newer
    committed generation; the newest three and current pointer remain valid.
18. a failure after snapshot/pointer commit is reported as deferred retention
    maintenance, not as a failed save; cleanup rereads and validates the complete
    current pointer inside its deletion transaction, aborting without deletion
    if it is absent or corrupt, while an intact committed generation remains
    loadable.
19. a correctly rehashed snapshot still fails semantic validation when nested
    world, dialogue, party, inventory, battle, creature, or move state is
    malformed; structural extra/missing fields report exact RFC 6901 pointers.
20. migration accepts only the explicitly tested source project version; merely
    naming a known old save format does not authorize an unknown version.
21. stable IDs that collide with inherited object properties fail schema
    validation before any lookup table or runtime state is created.
22. the generation store validates and normalizes an envelope before opening
    its write transaction; invalid input leaves pointer and snapshots unchanged.
23. a destructive import preview is modal for gameplay input, and dismissal by
    Escape clears the pending replacement as reliably as the Cancel button.
24. confirmation claims one pending import before asynchronous storage work, so
    concurrent confirmation cannot create a second replacement generation.
25. asynchronous Save, Load, Export, and Confirm control failures are handled by
    the UI, recorded in diagnostics, and announced without changing state.
26. envelope timestamps use the producer's canonical UTC ISO representation;
    arbitrary non-empty date strings are not portable metadata.
27. saved party/result/battle relationships preserve the authored campaign
    roles: the ally is a starter, loss retains one starter, and recruited
    victory retains exactly one starter plus the encounter creature; battle
    state cannot appear before a result while the campaign is in world/dialogue
    mode, and retained post-result health still agrees with the outcome.
28. storage persistence/quota estimates are optional diagnostics; rejection by
    either browser capability query does not prevent the validated playtest
    from starting or using its actual persistence boundary.
29. v1 migration validates the exact legacy snapshot shape before projection;
    correctly rehashed unknown fields are rejected rather than silently dropped.
30. inventory cannot appear consumed before a battle exists; a pre-result state
    with no battle retains the complete authored starting inventory.
31. fetched manifests are structurally validated before source discovery, and a
    broken root ends bootstrap in the normal diagnostic state without a loader
    `TypeError` or an intentionally unhandled application exception; malformed
    JSON, HTTP failure, and rejected fetches identify the failing source.
32. direct project imports enforce exact manifest/source correspondence: a
    declared campaign cannot be omitted, an undeclared campaign cannot be
    injected, continuity requires campaign data, and the provided additional-map
    list and source descriptors exactly match the validated manifest.
33. direct primary and continuity import entry points reject non-object source
    roots with ordinary source-linked diagnostics instead of leaking a property
    access `TypeError`.
34. project titles contain visible Unicode content but no Unicode controls,
    line/paragraph separators, or unsafe invisible/bidirectional format characters, preventing mixed invisible/control text from reaching
    diagnostics and rendered project identity.
35. every referenced spawn and map transition begins on a cell the simulation
    can enter: not authored collision and not occupied by a blocking character
    or beacon; invalid primary and additional-map placements fail before state.
36. a semantic failure in the primary map does not suppress validation of later
    structurally valid maps; one import returns source-linked diagnostics for
    both while still producing no partial project or world state.
37. a portable continuity snapshot always retains the start-map state, and no
    secondary map state may appear before a campaign result; correctly rehashed
    forged visit histories fail even when every individual world state is valid.
38. saved world messages belong to the fixture's authored/simulation-owned set,
    terminal messages agree with victory or loss (including the proven legacy
    message), and a map's transition count never exceeds its tick count.
39. every prefix of the canonical multimap continuity replay also produces a
    valid envelope, including the house's base/special messages; the Glintail-
    specific house message requires Glintail in the saved party.
40. each saved map owns exactly its authored flag namespace; maps with a beacon
    retain the required boolean state key, and any retained message on that map
    requires the lit flag; missing/additional keys or message-before-flag fail.
41. exact save/snapshot shapes require own properties; inherited prototype keys
    cannot satisfy required fields at the producer or importer boundary.
42. every save reference lookup requires an own authored dictionary entry;
    reserved inherited-object names in map history, active map, party, dialogue,
    creature, or move positions receive validation issues rather than resolving
    through a prototype or escaping as an internal exception.
43. a dialogue-mode party matches a companion-selection state reachable at its
    saved node: graph paths propagate whether `choose-companion` has occurred,
    so a pre-choice node cannot own a starter and a necessarily post-choice node
    cannot have an empty party.
44. retained battle turns account for authored action resources: ally move uses
    plus consumed battle items and opponent move uses match completed turns,
    including the single skipped final action determined by speed on victory or
    loss; forged turns or consumption fail even with a correct envelope hash.
45. world effects respect the map clock: an authored flag cannot be true and a
    retained message cannot exist before that map's first tick; correctly
    rehashed tick-zero effect histories fail.
46. transition trigger rectangles within one map do not overlap; otherwise
    array order would select the destination, so continuity import fails before
    project or state creation.
47. world and campaign display text contains at least one visible Unicode
    letter, number, punctuation mark, or symbol before state exists;
    whitespace/invisible-only names, dialogue, and labels fail structural
    validation while useful Unicode and multiline prose remain valid.
48. fetched manifest source names use a URL-safe portable filename grammar and
    have distinct case-insensitive identities; backslash/traversal-like input
    and source collisions fail before any referenced source request begins.
49. malformed generation pointers and stored-record metadata return structured
    load failures rather than throwing or constructing an envelope; pointer
    history is bounded by retention, ordered newest-first without gaps, and
    remains slot/generation-owned; snapshot records have an exact field set,
    generation/parent chain, and string payload/checksum ownership before
    hashing or parsing, and a corrupt pointer rejects a later save without
    changing pointer or snapshot inventory.
50. direct project imports normalize accepted roots to own serializable data and
    production Ajv validators inspect only own properties; inherited required
    or optional manifest fields cannot drive discovery/state, and missing or
    additional property diagnostics identify the exact JSON pointer; data that
    cannot cross the clone boundary returns a root diagnostic rather than an
    internal `DataCloneError`.

## Explicitly deferred

The static v1 fixture records a completed victory with `battle: null`. Its
lossless v2 projection has no migration-provenance field, so a post-outcome
world snapshot with no retained battle remains an accepted legacy shape.
Requiring battle history for every outcome needs a future save-format version
and explicit migration policy; this phase does not invent missing combat data.

Multiple user-facing slots, cloud synchronization, accounts, conflict merging,
service workers, PWA updates, OPFS, File System Access as a requirement, audio,
touch/gamepad parity, localization, deeper battle mechanics, general events,
quests, modules, editor architecture, and long-term public save compatibility
remain outside Phase 2B.

## Implementation guardrails

- Re-derive production persistence from the accepted requirements; do not copy
  the spike implementation.
- Keep storage behind a small fixture-owned boundary and simulation free of
  IndexedDB/browser dependencies.
- Never replace valid state before full import validation succeeds.
- Never use time, storage generation, or random IDs in deterministic state.
- Do not split packages or publish APIs from this second fixture alone.
