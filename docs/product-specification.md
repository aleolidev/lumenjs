# Product specification direction

Status: direction approved; First Light and the focused Phase 2 campaign slice
completed and locally validated on 2026-07-11.

This document turns the capability inventory into delivery phases and proposes
the first production-quality vertical prototype. It is a prioritization
document, not an engine architecture or public API specification.

## Product outcome

LumenJS should let a creator assemble a polished, original creature-RPG for the
web through a modern workflow, while keeping the engine small, understandable,
and useful outside one fixed campaign design.

The first proof should demonstrate the shortest credible creator loop:

1. author a small map in an existing visual tool;
2. describe project-owned gameplay data in readable files;
3. receive precise validation when those sources disagree;
4. launch a focused playtest quickly;
5. explore and interact in a polished 2.5D scene; and
6. reproduce behavior from recorded inputs.

This loop is more informative than implementing isolated renderer, battle, or
editor subsystems because it crosses authoring, data ownership, runtime
coordination, rendering, input, simulation, diagnostics, and testing.

## Prioritization rules

Capabilities enter an earlier phase when they:

- are necessary to prove the creator-to-player loop;
- constrain several later systems or expose dependency direction;
- reduce creator risk through validation, diagnostics, or recovery;
- can be exercised with original, redistributable fixtures; and
- provide evidence for a boundary without requiring speculative generality.

Capabilities enter a later phase when they require an unproven host boundary,
an operational service, substantial content scale, physical-device evidence, or
a second real use case before their abstraction can be justified.

## Delivery phases

### Phase 1: explorable vertical prototype

Prove that an original, validated project can become a deterministic, polished,
playable 2.5D web scene through a short creator workflow.

In scope:

- a minimal project manifest and versioned project-owned data;
- external Tiled JSON import with separate typed Lumen metadata;
- one bounded map with ground, elevation/interleaving cases, collision, spawn,
  an interactable character, and a transition or world-state change;
- keyboard input and an explicit input-to-simulation boundary;
- deterministic fixed-step movement and interaction facts;
- a specialized WebGPU scene with sprites, camera, depth, and the minimum tile
  paths needed by the fixture;
- the rectangular top-down three-quarter visual direction defined in
  `docs/visual-direction.md`, using 2D textures and sprites with optional simple
  3D geometry and optional decorative shaders;
- an explicit unsupported-WebGPU result rather than a hidden fallback promise;
- focused playtest startup, actionable validation errors, runtime diagnostics,
  and replay of the fixture's input log;
- executable Node, browser-matrix, and headed-WebGPU tests; and
- wholly original placeholder art, text, names, and data with provenance.

The prototype deliberately excludes battles, creature collection, saves, audio,
gamepad/touch parity, a built-in editor, third-party modules, package publishing,
and a general event language. These are not implied by placeholder interfaces.

### Phase 2: campaign slice

Prove the smallest recognizable creature-RPG loop using the boundaries learned
from Phase 1.

Candidate scope:

- dialogue and choices;
- a small data-defined creature roster, party, and inventory;
- one deterministic single battle with replay and structured explanation;
- capture or a similarly meaningful collection transition;
- a generational local save plus portable export/import;
- basic audio, responsive UI, remapping, and accessibility settings; and
- creator diagnostics spanning world, dialogue, and battle state.

Phase 2 must begin with a specification review of Phase 1 evidence. No Phase 1
boundary automatically becomes public API.

The focused proposal is recorded in
`docs/phase-2-campaign-slice-specification.md`. Its first increment deliberately
limits scope to dialogue, a companion choice, one deterministic battle, and one
authored recruitment outcome. Persistence, audio, and broader input work remain
deferred until that loop is validated.

### Phase 3: creator workflow and standard preset

Prove that a new creator can build and diagnose a small original campaign
without editing engine internals.

Candidate scope:

- guided project creation and a coherent standard preset;
- schema-driven data editing where it improves the workflow;
- dialogue, quest, encounter, trainer, and creature authoring;
- focused playtest entry points and runtime inspectors;
- safe refactors, migrations, backups, localization, and static web export; and
- the first evidence-based runtime/editor module pair.

The external Tiled workflow remains valid unless real use demonstrates that an
integrated map editor materially improves the product.

### Phase 4: extensibility and advanced structures

Validate reusable modules against distinct real campaign needs: contextual
battlefields, open-world scaling, challenge overlays, roguelite runs, original
bestiary pipelines, side activities, or compositional creatures.

Only this phase should settle broad module contracts, replacement boundaries,
on-demand loading, and compatibility policy. Each boundary requires multiple
real consumers or another concrete reason for interchangeability.

### Phase 5: distribution and optional services

Harden consumer packaging, provenance, updates, PWA behavior, physical-device
coverage, and long-lived compatibility. Trading, PvP, cloud synchronization,
gifts, leaderboards, and other operated features remain external services until
their ownership, privacy, moderation, failure, and longevity models are funded
and specified.

## Proposed first vertical prototype

Working name: **First Light**.

A creator opens an original micro-map in Tiled, places stable named objects, and
maintains gameplay metadata in a separate Lumen-owned file. A focused playtest
loads the project, reports source-linked validation failures, and otherwise
opens a small 2.5D scene. The player walks through terrain with a visible depth
case, talks to a guide, triggers one state change, and crosses a transition. A
recorded input sequence reproduces the same final state and structured facts.

### Why this prototype comes first

It tests the highest-leverage assumptions from research:

- whether the core can remain smaller than the game systems built upon it;
- whether Tiled geometry and Lumen gameplay data remain cleanly separated;
- whether simulation can be deterministic without dictating future battle APIs;
- whether static and interleaved tile semantics justify distinct GPU paths;
- whether diagnostics make the workflow approachable rather than merely valid;
- whether browser/platform responsibilities stay explicit; and
- where actual dependency direction appears in a complete use case.

### Required fixture

The fixture should be intentionally small but adversarial:

- one original map that fits on screen only when the camera moves;
- static terrain plus a bridge, overhang, or comparable interleaving case;
- collision boundaries and one transition boundary;
- a named spawn and a named interactive character;
- one interaction that changes a visible project-owned state value;
- one deliberately broken variant for source-linked validation tests; and
- one canonical replay with expected state hash and ordered facts.

It should not mimic a protected game's map, terminology, assets, or data.

### Acceptance criteria

The prototype is complete only when:

1. a clean install and documented command launch the focused playtest;
2. project and imported map data are structurally and semantically validated
   before runtime state is created;
3. broken cross-references identify the relevant source and stable object ID;
4. validated inputs drive a synchronous deterministic simulation boundary;
5. the canonical replay yields the same versioned state hash and fact sequence;
6. the WebGPU path renders the fixture with correct camera, sprite, tile, and
   interleaving semantics on the verified local GPU lane;
7. unsupported WebGPU produces a clear capability result and does not claim a
   successful renderer fallback;
8. diagnostics expose project/schema versions, input and simulation state,
   renderer capabilities, frame metrics, and draw/upload counts;
9. Node tests, three-engine semantic browser tests, and headed WebGPU tests pass;
10. all fixture content is original and its provenance is recorded; and
11. a retrospective records which boundaries should be kept, changed, or
    removed before any public API is declared.

Performance is judged against an explicit fixture budget established when the
real scene exists, not the isolated spike's local timings. Cross-browser tests
may validate unsupported capability behavior; they do not substitute for GPU
rendering evidence.

### Implementation guardrails

- Do not copy or import production code from `spikes/`; rederive the smallest
  implementation from the accepted requirements.
- Do not create generic battle, quest, ECS, plugin, asset-pipeline, or editor
  abstractions for hypothetical future use.
- Do not call a boundary replaceable until another implementation or a concrete
  isolation need exists.
- Keep time, randomness, input, rendering, and project loading explicit and
  injectable where the fixture needs deterministic tests.
- Add Ajv or another runtime dependency only after the production validation
  boundary and bundle impact are reviewed.
- Do not add `idb`; persistence is outside this prototype.
- Treat Vite, Playwright, Biome, and TypeScript checking as tools, not runtime
  architecture.
- Preserve one package and one lockfile.

## Approval record

The product direction and full First Light implementation were approved on
2026-07-11. The implementation may create the smallest `src` layout justified
by the accepted technical specification. Spike code must still not be promoted,
and no First Light boundary is a declared public API.
