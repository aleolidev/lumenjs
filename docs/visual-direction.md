# LumenJS visual direction

Status: validated by the corrected First Light prototype on 2026-07-11.

## Baseline

LumenJS targets a rectangular top-down three-quarter presentation for its
standard creature-RPG experience. This is the 2.5D language demonstrated by
handheld-era games that combine 2D pixel art with depth and selected 3D
structures. It is not an isometric projection.

World X remains horizontal on screen. World Y remains vertical with shallow
foreshortening from the camera pitch. Maps retain a rectangular tile grid.
Characters and most objects are 2D billboards anchored at their feet, while
terrain is assembled from 2D textures.

## 2D-first composition

- Terrain, paths, water, foliage, props, effects, and characters should default
  to pixel-art textures or sprites.
- Nearest-neighbor sampling is the classic baseline.
- Sprite anchoring and world depth must support walking in front of, behind,
  below, and above scenery.
- Pixel-art assets remain usable without post-processing.
- The engine must not require a fully 3D asset workflow for a normal project.

## Optional simple 3D

Simple textured geometry may represent houses, bridges, cliffs, stairs, and
other structures where real planes and elevation materially improve the scene.
Those surfaces should use pixel-art textures and preserve the same visual scale
as sprites and terrain.

First Light proves this direction with a small house made from one raised roof
plane and one vertical facade. It does not yet select a model format, loader,
lighting model, or general scene graph.

## Visual modes

The standard presentation has two capability-independent choices:

- **Classic:** nearest-neighbor texture sampling with no decorative color
  grading. This is the required baseline.
- **Enhanced:** optional shader effects layered over the same scene semantics.
  First Light demonstrates saturation and warm grading only.

Future effects such as dynamic lights, shadows, water, fog, bloom, outlines, or
depth of field must remain optional and independently budgeted. Disabling them
must not affect simulation, collision, content, or playability.

## Validation rules

- A semantic test must identify the projection and count textured, sprite, and
  simple-3D items without requiring a GPU.
- Browser tests must prove visual-mode changes do not alter simulation state.
- A real WebGPU lane must validate texture loading, draw budgets, shader modes,
  and an empty GPU error list.
- Visual inspection remains required because successful submission metrics do
  not prove that the canvas contains the intended image.

## Deferred choices

Animated sprite formats, texture-atlas tooling, glTF or another 3D format,
lighting, shadow maps, material contracts, camera zoom, elevation traversal,
and artist-facing import tools require additional real fixtures before they can
become product contracts.
