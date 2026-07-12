# Phase 6 standard-preset architecture specification

Status: accepted implementation specification, 2026-07-12.

## Outcome

Phase 6 converts the completed research corpus and experimental games into an
ordered, testable architecture program for the official creature-RPG preset. It
does not claim that the preset already implements the capability matrix, make
the internal First Light structure public, publish npm, or promise compatibility
with Pokémon Essentials or RPG Maker projects.

The phase is complete when:

1. every capability-taxonomy bullet has one executable-matrix row;
2. every row has a reference, Lumen role, runtime owner, authoring owner,
   validation/debug route, evidence target, goal, and status;
3. the private target dependency graph is explicit;
4. identity, source, compilation, cache, version, diagnostic, extension, and
   event/effect decisions are recorded;
5. architecture fitness tests protect both the present source tree and roadmap
   traceability; and
6. a completion audit maps these requirements to current evidence.

## Product assembly

The beginner-facing product is one installed package and one coherent preset:

```text
creator workbench / CLI
          |
presentation + platform adapters
          |
official creature-RPG systems
          |
deterministic core contracts
```

Arrows point toward dependencies. The preset hides assembly; advanced projects
may deliberately replace proven contracts later. Directory count and module
terminology do not themselves justify public packages or extension points.

## Private target layers

| Layer | Owns | May depend on | Must not own |
| --- | --- | --- | --- |
| Core contracts | lifecycle, actions/facts, stable identity types, clock/RNG interfaces, transactions, diagnostics, capability registration | browser-independent language facilities | filesystem, DOM, fetch, WebGPU, Web Audio, concrete game rules |
| Creature-RPG systems | world, narrative, collection, battle, progression, inventory, economy, campaign state | core contracts and other systems only through declared contracts | creator UI, transport, browser storage, rendering |
| Platform adapters | input, lifecycle, persistence storage, files/downloads, audio device, browser capabilities | core contracts and browser APIs | game-rule decisions |
| Presentation | scene building, renderer, animation, UI projections, themes, accessibility presentation | core read models, system snapshots, platform adapters | authoritative simulation state |
| Creator tooling | load/compile, schemas, semantic validation, editors, refactors, migrations, focused tests, diagnostics, builds | public authoring contracts and read-only runtime test harnesses | alternate copies of runtime rules |
| Application/preset assembly | defaults, selected modules, composition, application lifecycle | all declared lower layers | reusable rules hidden in one fixture |
| External services | optional protocols and operated implementations | versioned public contracts | baseline creation, saves, builds, or offline play |

The current `src/project`, `src/simulation`, `src/persistence`, `src/render`,
`src/scene`, and `src/app` directories remain First Light evidence. They are not
silently renamed into the target layers. `src/core` is the only current package
runtime boundary, and its dialogue/encounter contracts remain experimental
until the Goal 6 baseline decision and later multi-project evidence settle them.

## Current enforceable layer map

`src/architecture/layers.json` describes the import constraints that are true
today. Production source imports are checked by
`src/architecture/architecture.test.js`.

- `core` imports no other Lumen source and no Node built-ins.
- `project` owns import/validation and imports no other Lumen production layer.
- `simulation` may compose only simulation files.
- `modules` remains a data-only resolver with no Lumen production dependency.
- `persistence` may compose persistence only; storage adapters do not become
  simulation owners.
- `render` and `scene` do not import game rules.
- `creator` may use project validation and module data resolution, but does not
  import First Light simulation, persistence, rendering, scene, or app code.
- `app` is the current composition root and may depend on internal evidence
  layers.

Test and distribution audit files may cross layers to prove integration. That
exception never applies to production files.

## Stable identity and references

1. Every authored entity uses a project-owned, portable stable string ID.
2. IDs are unique within an explicit namespace, never inferred from labels,
   paths, array order, localized text, or object identity.
3. References are stored as `{ namespace, id }` conceptually. A compact string
   is allowed only where the owning schema supplies the namespace unambiguously.
4. Modules own namespaces below their declared module ID. Projects may add
   extension data only under a declared project/module namespace.
5. Rename and removal are graph operations with preview, complete reference
   updates, validation, immutable backup, and rollback.
6. Compiled numeric indices are disposable implementation details and never
   enter authored data, saves, logs, or public diagnostics.

## Sources, compilation, and caches

Canonical sources remain human-readable, versioned, Git-friendly, and usable
without the workbench. Tiled geometry stays external with Lumen semantics in
Lumen-owned sources until evidence favors another map authoring boundary.

The compiler performs these deterministic stages:

1. discover the exact manifest-declared source graph;
2. parse without executing project code;
3. validate structural schemas;
4. resolve identities and semantic references;
5. normalize only where the canonical format explicitly permits it;
6. compile immutable runtime read models and dependency indexes;
7. hash canonical inputs, compiler version, schema versions, and installed
   module contracts; and
8. write a disposable cache atomically.

Cache keys include all semantic inputs. A clean build and a cache hit must be
byte/meaning equivalent. Unknown compiler/cache versions cause rebuild, never
source mutation. Compiled caches are excluded from project ownership and may be
deleted at any time.

Raw round trip means parsing and writing without a requested edit preserves
semantic content and stable ordering. Tools must preview formatting changes and
must never let a compiled cache overwrite canonical sources.

## Version and compatibility records

Version independently:

- project manifest and each canonical document schema;
- save envelope and authoritative snapshot;
- compiler/cache format;
- public SDK when one exists;
- every module contract and module-owned data schema; and
- replay/log protocol.

A future `lumen.lock` records the exact engine, preset, module, contract, and
content-provider versions used by a verified build. It is not introduced until
Goal 15 specifies module resolution. Until then `package-lock.json`, project
schema versions, and export manifests remain authoritative for their scopes.

Compatibility ranges never imply successful migration. Upgrades produce a
plan, validate prerequisites, back up owned sources/saves, migrate
transactionally, revalidate, and permit rollback. Missing modules or unsupported
versions produce explicit diagnostics rather than partial loading.

## Diagnostics

Every diagnostic has a stable code, severity, concise message, remedy, source
URI/path, JSON pointer or text span, relevant identity, and related locations
when available. Runtime facts additionally carry deterministic sequence and
provenance. Tools may add presentation, never parse English messages to recover
meaning.

Validation aggregates independent failures when safe. No runtime state is
created from structurally or semantically invalid required sources. Diagnostic
bundles disclose their inventory and privacy behavior before export.

## Extension-data policy

- Unknown root properties are rejected; silent typo acceptance is forbidden.
- A module may own data only beneath its declared namespace and registered
  schema/version.
- Project-specific extensions use a project-owned namespace and cannot shadow
  core or installed-module fields.
- Runtime access is capability-injected and read-only unless an explicit
  transaction grants mutation.
- Uninstalled-module data is an error unless a future manifest explicitly marks
  it as preserved opaque data for round-trip compatibility.
- Schema contribution does not grant runtime, filesystem, DOM, network,
  persistence, clock, RNG, renderer, or editor authority.

## Event and effect boundary

Events and effects share infrastructure but are not one untyped scripting VM.

An **event** is authored orchestration with identity, trigger, typed conditions,
ordered commands, suspension/cancellation policy, local state, and deterministic
execution facts. It coordinates world, narrative, quest, cutscene, and battle
entry/result workflows.

An **effect** is a typed domain proposal such as damage, heal, status, item
grant, quest advance, world mutation, audio cue, or presentation cue. Its owning
system validates and applies authoritative state changes. Effects carry source,
scope, ordering phase, targets, parameters, and explanation provenance.

Rules:

1. event commands request capabilities; they do not reach into another
   system's state;
2. each effect kind has exactly one authoritative owner;
3. conditions query declared read models, not mutable globals;
4. time, clock, RNG, input, and external I/O are injected and logged;
5. simulation effects are deterministic and replayable; presentation cues may
   be skipped without changing authoritative state;
6. recursion, loops, cancellation, retries, and maximum work are explicit;
7. project scripting is reserved for concrete cases that typed commands/effects
   cannot express and remains a Goal 15 decision; and
8. battle effects may use richer phase/replacement semantics behind the same
   provenance requirements without forcing world events into battle internals.

Goal 7 owns event orchestration and narrative/quest authoring. Goal 9 owns the
battle effect pipeline. Goal 11 owns economy/progression effects. Their shared
contracts become public only after real cross-system and multi-game evidence.

## Standard-preset defaults and escape hatches

The preset supplies a complete traditional creature-RPG loop with conservative
defaults: grid exploration, explicit interactions, localized dialogue, quest
journal, party/storage, deterministic turn battles, authored encounters,
experience/levels, inventory/shops, local saves, keyboard/touch/gamepad-facing
input adapters, accessible responsive UI, and static export.

Beginners choose the preset, not its dependency graph. Advanced projects may:

- edit every canonical source directly;
- provide project-owned content and extension data;
- replace only contracts proven replaceable by Goal 15;
- add optional campaign/side-system modules from Goal 16; and
- omit unused optional facilities without breaking baseline tooling.

Escape hatches never include monkey-patching, mutable globals, undocumented
private imports, template merging, compiled-cache editing, or disabling source
validation. Forking remains legally possible under Apache-2.0 but is not the
supported extension workflow.

## Baseline contract decision

The current TypeScript `createGame` boundary is supported only as the unpublished
`0.1.0` experimental candidate. Its movement, dialogue, companion, and fixed
encounter features have two fixture consumers, but those games were maintained
inside this repository and deliberately share a narrow creator format.

Therefore:

- keep the boundary public within the experimental tarball so clean consumers
  and declarations remain testable;
- do not call it the final core, preset, battle API, or compatibility promise;
- permit breaking experimental version increments with explicit audit;
- use it as migration evidence for Goals 7–10, not as a constraint that forces
  the full preset into one file; and
- require an independently maintained game before any long-lived compatibility
  declaration.

## Phase exclusions

Phase 6 designs and tests ownership; it does not implement the systems assigned
to Goals 7–20, create a monorepo, publish a package, connect a new service,
declare physical-device/AT coverage, import protected content, or promise
project/plugin compatibility with another engine.
