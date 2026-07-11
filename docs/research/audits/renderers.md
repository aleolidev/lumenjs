# Renderer audits

Audit date: 2026-07-11.

## Summary

| Candidate | Pin | Best role | Reference score | Confidence | Label |
| --- | --- | --- | ---: | --- | --- |
| PlayCanvas Engine | [v2.18.0](https://github.com/playcanvas/engine/releases/tag/v2.18.0) | Device/backend abstraction, render passes, profiling | 4.4 | Medium | Primary reference |
| PixiJS | [v8.18.1](https://github.com/pixijs/pixijs/releases/tag/v8.18.1) (`8f42bb7`) | Sprites, atlases, batching, filters, visual tests | 4.4 | Medium | Primary reference |
| Babylon.js | [8.45.3](https://github.com/BabylonJS/Babylon.js/releases/tag/8.45.3) | WebGPU robustness, instrumentation, test oracle | 3.8 | Medium | Secondary reference |
| melonJS | [v19.8.0](https://github.com/melonjs/melonJS/releases/tag/v19.8.0) | 2.5D semantics, Tiled, Canvas degradation | 3.8 | Low-medium | Primary product reference / spike |

Scores summarize the stated role and are not directly comparable as dependency
scores. Exact commit SHAs remain to be recorded for every tag in a local audit.

## PlayCanvas Engine

Primary evidence:

- [package and exports](https://github.com/playcanvas/engine/blob/v2.18.0/package.json)
- [source](https://github.com/playcanvas/engine/tree/v2.18.0/src)
- [tests](https://github.com/playcanvas/engine/tree/v2.18.0/test)
- [examples and device selection](https://github.com/playcanvas/engine/tree/v2.18.0/examples)
- [license](https://github.com/playcanvas/engine/blob/v2.18.0/LICENSE)

Strengths:

- Explicit WebGL2 and WebGPU backends.
- Production, debug, and profiler build flavors.
- Very few runtime dependencies for an engine of its breadth.
- Strong frame, render-pass, asset, example, and profiling references.

Risks:

- Adopting the engine would also import a broad 3D/entity architecture.
- Its general-purpose API is larger than LumenJS should expose.

Decision: study device negotiation, frame graph, profiling builds, and backend
parity. Do not adopt the full engine.

## PixiJS

Primary evidence:

- [package and exports](https://github.com/pixijs/pixijs/blob/v8.18.1/package.json)
- [renderer implementations](https://github.com/pixijs/pixijs/tree/v8.18.1/src/rendering/renderers)
- [extension registry](https://github.com/pixijs/pixijs/tree/v8.18.1/src/extensions)
- [tests](https://github.com/pixijs/pixijs/tree/v8.18.1/tests)
- [license](https://github.com/pixijs/pixijs/blob/v8.18.1/LICENSE)

Strengths:

- Best evaluated reference for high-throughput 2D rendering.
- WebGPU and WebGL systems under a shared renderer surface.
- Explicit extension registry and subpath exports.
- Unit, type, and image-based visual tests.

Risks:

- Scene graph and ticker patterns must not define gameplay state or time.
- Formal automated performance evidence is less prominent than its claims.
- Side-effect registration requires careful tree-shaking analysis.

Decision: primary source for sprite/atlas/text/filter batching and visual
fixtures. Run a direct parity/performance spike before considering reuse.

## Babylon.js

Primary evidence:

- [package structure](https://github.com/BabylonJS/Babylon.js/tree/8.45.3/packages)
- [core](https://github.com/BabylonJS/Babylon.js/tree/8.45.3/packages/dev/core)
- [WebGPU backend](https://github.com/BabylonJS/Babylon.js/tree/8.45.3/packages/dev/core/src/Engines/WebGPU)
- [test tools](https://github.com/BabylonJS/Babylon.js/tree/8.45.3/packages/tools/testTools)
- [license](https://github.com/BabylonJS/Babylon.js/blob/8.45.3/license.md)

Strengths:

- Exceptional breadth of rendering tests, inspector, instrumentation, and
  WebGPU compatibility behavior.
- Mature WebGL/WebGPU coexistence and modular loader/material ecosystem.

Risks:

- Repository and runtime surface are disproportionately large for LumenJS.
- Compatibility layers and accumulated features obscure the minimal design.

Decision: use as a robustness oracle and source of adversarial fixtures, not as
the base runtime.

## melonJS

Primary evidence:

- [renderer source](https://github.com/melonjs/melonJS/tree/v19.8.0/packages/melonjs/src/video)
- [tests](https://github.com/melonjs/melonJS/tree/v19.8.0/packages/melonjs/tests)
- [license](https://github.com/melonjs/melonJS/blob/v19.8.0/LICENSE)

Strengths:

- Closest evaluated product shape: small 2.5D engine with Tiled, tilemaps,
  camera, collision, lighting, meshes, and automatic Canvas fallback.
- Low dependency and bundle ambitions.

Risks:

- No WebGPU backend at the audited point.
- Published performance and size claims need local reproduction.
- Its definition of 2.5D may not match the target visual composition.

Decision: primary reference for world semantics and degradation, plus a spike
candidate. It is not the renderer base.

## Combined conclusion

The working renderer hypothesis is specialized and hybrid:

- device/backend boundary and profiling patterns from PlayCanvas;
- sprite, atlas, batching, and visual-test patterns from PixiJS;
- 2.5D map and fallback behavior from melonJS;
- WebGPU failure and compatibility cases from Babylon.js.

LumenJS still needs its own measured prototypes for tile strategy, depth/alpha
sorting, sprite/mesh lighting, uploads, device loss, and low-end devices.
