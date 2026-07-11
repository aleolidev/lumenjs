# First Light retrospective

Date: 2026-07-11.

## Outcome

First Light proves the first complete LumenJS creator-to-play loop. An external
Tiled map and separate Lumen-owned metadata are validated, imported into a small
world definition, simulated synchronously from validated actions, converted to
semantic scene items, and rendered through WebGPU. The same path is executable
from keyboard input and a versioned canonical replay.

The original implementation incorrectly interpreted 2.5D as an isometric
projection. The corrected result uses the intended rectangular top-down
three-quarter camera, 2D pixel-art textures and sprites, optional simple 3D
geometry, and optional decorative grading. This correction was validated
visually in the real WebGPU browser lane rather than inferred from submission
metrics alone.

The result is intentionally a vertical prototype rather than a general engine.
No public API or package split is declared by this work.

## Boundaries to keep for the next specification

- **Source validation before runtime creation.** Structural and semantic errors
  remain separate concerns but produce one source-linked result.
- **Tiled geometry plus Lumen metadata.** Stable named-object references kept
  generic editor properties out of the gameplay model and failed clearly when
  an object was missing.
- **Synchronous simulation.** Serializable state, validated actions, structured
  facts, and a versioned state hash made replay tests direct and browser-free.
- **Semantic scene construction.** Bridge interleaving can be tested without a
  GPU, while the renderer stays concerned with geometry and submission.
- **2D-first top-down rendering.** Rectangular world coordinates remain screen
  axes, nearest-neighbor textures supply the world, and billboard sprites remain
  independent from optional simple 3D structures.
- **Optional visual treatment.** Classic and enhanced modes share identical
  simulation and scene meaning; enhanced grading is a presentation choice.
- **Explicit capability result.** Browser tests remain useful without treating
  a non-GPU path as successful rendering.
- **One package.** The five internal directories express dependency direction
  without creating publication or compatibility boundaries.

## Boundaries to change before broader use

- The project and imported-world shapes need named JSDoc types before they grow;
  the prototype currently relies heavily on inference from validated JSON.
- Recreating and uploading the complete vertex buffer per action is acceptable
  within the fixture budget, but static terrain should become a retained GPU
  resource when camera animation or larger maps enter scope.
- Depth rules are explicit enough for the bridge fixture but are not a general
  elevation model. The next world fixture must define traversal elevation rather
  than infer it only while building a scene.
- Keyboard dispatch is intentionally discrete. A future movement specification
  must decide animation, fixed-timestep accumulation, held input, and collision
  granularity together.
- Diagnostics are complete but developer-oriented. Creator-facing source links,
  filtering, and export should be designed with the future authoring workflow.

## Boundaries to remove or avoid

- Do not preserve the First Light interaction as a general event system.
- Do not expose the scene-item or renderer shapes as public APIs.
- Do not promote the generated fixture atlas into a general asset pipeline.
- Do not add persistence, module hooks, an ECS, or renderer interchangeability
  based on this single consumer.
- Do not retain spike implementations as parallel production paths.

## Measured evidence

- Node verification covers project import, structural and semantic errors,
  movement, collision, interaction, transition, replay/hash, and bridge depth.
- Chromium, Firefox, and WebKit cover project load, keyboard interaction,
  canonical replay, diagnostics, unsupported capability behavior, and narrow
  layout.
- Headed Chromium configures a real WebGPU canvas, loads three original texture
  resources, and submits the scene in no more than four draw calls with more
  than 160 semantic scene items and less than 256 KiB of geometry upload per
  frame.
- The 120-frame serial GPU lane meets the prototype's 4 ms median CPU
  scene-build plus encode/submit budget.

## Next product decision

First Light supports beginning the Phase 2 campaign-slice specification. That
phase should introduce one creature loop and one deterministic battle while
preserving the proven validation, simulation, replay, and diagnostics direction.
It should revisit elevation and retained rendering with a second real map before
either becomes a public contract.
