# First Light technical specification

Status: approved for implementation on 2026-07-11.

## Experience

First Light is a focused playtest of an original place called Lantern Vale. The
player starts west of a guide, walks around solid scenery, speaks to the guide
to light a beacon, passes beneath and then over a raised bridge, and reaches the
east trail transition. The transition returns the player to the spawn so it can
be exercised repeatedly.

The fixture is deliberately wider than the playtest viewport. A following
camera is therefore required.

## Creator workflow

The creator edits:

- `public/first-light/lantern-vale.tmj` in Tiled for geometry and stable named
  objects;
- `public/first-light/world.lumen.json` for typed gameplay meaning; and
- `public/first-light/project.lumen.json` for the project manifest.

The playtest command starts Vite and loads those three sources. Loading has two
stages: structural JSON Schema validation followed by semantic resolution of
stable Tiled object names. Runtime state is created only from a successful
result. Diagnostics retain source paths and object names.

## Production boundaries

The first implementation has five directed boundaries:

```text
project sources -> validation/import -> world definition
                                      -> simulation -> render scene -> WebGPU
                                                     -> diagnostics UI
keyboard -> validated actions -> simulation
replay   -> validated actions -> simulation
```

- `src/project/` owns schemas, validation, and Tiled-to-world import.
- `src/simulation/` owns serializable state, legal actions, transitions, facts,
  replay, and state hashing. It has no browser or renderer dependency.
- `src/scene/` converts a world and simulation state into semantic draw items.
- `src/render/` owns WebGPU capability setup and drawing only.
- `src/app/` coordinates the browser playtest and diagnostics.

These are internal production boundaries, not public APIs or evidence for
separate packages.

## Data contract

The manifest names the project, schema version, start map, and source paths. The
Lumen world file owns spawn, character, interaction, bridge, and transition
meaning. Each item references a stable named Tiled object. Tiled owns map size,
tile size, layers, and object rectangles.

The imported world definition contains only resolved, validated values needed
by the prototype. Raw source objects do not become mutable runtime state.

## Simulation contract

The simulation is synchronous. Each step accepts exactly one action:
`move-north`, `move-south`, `move-west`, `move-east`, `interact`, or `wait`.
Movement occurs on the fixture grid and is rejected by bounds or collision.
Interaction checks the faced cell. Lighting the beacon changes project-owned
state and emits structured facts. Entering the transition emits a fact and
returns the player to spawn.

A replay records format version, project version, ordered actions, expected
state hash, and expected facts. Hashing uses a versioned deterministic function
over canonical state data; it is a regression identity, not a security digest.

## Rendering contract

The renderer requires WebGPU. Unsupported browsers receive an explicit
`unsupported` capability result and no fallback renderer is claimed.

The camera uses a rectangular top-down three-quarter projection with a shallow
38-degree visual pitch. It is not isometric: world X remains screen-horizontal,
world Y remains screen-vertical with foreshortening, and map tiles stay
rectangular. The camera clamps to map boundaries.

The scene builder emits textured draw items for static terrain, collision
scenery, bridge deck, guide, beacon, and player. Terrain and objects use a pixel
art atlas; player and guide use transparent 2D sprites. Depth derives from world
position, with explicit bridge planes so the player can appear below the deck
on the lower path and above it on the raised path.

One small house proves optional simple 3D composition through a raised textured
roof plane and a textured front face. This is fixture-specific geometry, not a
general model loader.

The classic visual mode performs nearest-neighbor texture sampling without
decorative grading. The enhanced mode adds optional saturation and warm color
grading in the fragment shader without changing simulation or scene semantics.
The renderer uses a depth attachment and exposes textures, projection, mode,
GPU validation errors, draw, vertex, upload, frame-time, viewport,
adapter-feature, and limit diagnostics.

## Tests

- Node tests cover valid import, structural errors, broken source references,
  legal movement, collision, interaction, transition, deterministic replay,
  state hash, and semantic interleaving plans.
- Chromium, Firefox, and WebKit cover successful project loading, keyboard
  actions, diagnostics, narrow layout, and explicit unsupported-WebGPU behavior.
- Headed Chromium additionally requires a real adapter, successful WebGPU
  configuration and submission, non-zero render metrics, and the canonical
  scene interaction.

## Performance budget

For the fixed fixture on the locally verified GPU lane:

- no more than 4 draw calls per frame;
- no more than 256 KiB of geometry upload per frame;
- median CPU scene-build plus encode/submit time below 4 ms across 120 frames.

These are prototype regression budgets, not cross-device product promises.

## Deferred decisions

Battles, general events, dialogue trees, persistence, audio, touch/gamepad,
editor embedding, modules, public exports, asset pipelines, renderer fallback,
and package publication remain outside First Light.
