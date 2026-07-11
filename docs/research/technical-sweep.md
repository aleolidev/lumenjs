# Initial technical repository sweep

Snapshot date: 2026-07-11.

This pass identifies serious candidates for deeper source-level evaluation. It
does not select dependencies. Activity is a time-sensitive signal and must be
checked again before adoption.

## Rendering and WebGPU

| Repository | License | Evidence and potential use | Main caution |
| --- | --- | --- | --- |
| [GPUWeb specification](https://github.com/gpuweb/gpuweb) | W3C materials | Authoritative API, WGSL, limits, validation, feature and device behavior. | Specification, not engine architecture. |
| [WebGPU Samples](https://github.com/webgpu/webgpu-samples) | BSD-3-Clause | Primary executable examples for buffers, textures, compute, shadows, deferred rendering, queries. | Educational examples do not form a production renderer. |
| [WebGPU Fundamentals](https://github.com/greggman/webgpu-fundamentals) | MIT | Clear low-level reference for layout, blending, texturing, cameras, and timing. | Explicit teaching code should not be copied into architecture wholesale. |
| [PlayCanvas Engine](https://github.com/playcanvas/engine) | MIT | Strongest integral web reference: WebGPU/WebGL2, frame graph, cameras, batching, lights, assets, profiling. | Large general 3D engine with different product goals. |
| [PixiJS](https://github.com/pixijs/pixijs) | MIT | Strongest 2D reference for sprites, batching, atlases, filters, masks, text, assets, and WebGPU/WebGL. | Renderer and mutable scene graph, not a deterministic game platform. |
| [PixiJS Tilemap](https://github.com/pixijs-userland/tilemap) | MIT | Specialized tile batching, composite layers, spritesheets, and WebGPU demonstrations. | Pixi-coupled and not a complete 2.5D terrain solution. |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | Apache-2.0 | Mature dual backend, pipeline caches, materials, glTF, inspector, playground, and broad rendering tests. | Enormous surface and compatibility weight. |
| [Three.js](https://github.com/mrdoob/three.js) | MIT | Cameras, sprites, scene graph, loaders, materials, post-processing, and examples. | Not a game engine; WebGPU APIs and performance behavior continue evolving. |
| [Orillusion](https://github.com/Orillusion/orillusion) | MIT | WebGPU-first TypeScript contrast with compute, lighting, shadows, and post-processing. | Smaller adoption and no fallback backend. |
| [wgpu](https://github.com/gfx-rs/wgpu) / [Bevy](https://github.com/bevyengine/bevy) | MIT/Apache-2.0 | Transferable references for render graphs, extraction, pipeline caches, batching, assets, visibility, and profiling. | Rust and a much heavier ECS architecture. |
| [stats-gl](https://github.com/RenaudRohlinger/stats-gl) | MIT | GPU/CPU timing, timestamp queries, texture capture, workers, and headless profiling ideas. | GPU timestamps are not universally available. |
| [Basis Universal](https://github.com/BinomialLLC/basis_universal) | Apache-2.0 | Portable texture compression and runtime transcode targets. | C++/WASM pipeline cost; unnecessary for some pixel-art assets. |
| [KTX-Software](https://github.com/KhronosGroup/KTX-Software) | Mixed by component | KTX2 creation, validation, compression, comparison, and transcoding. | Distribution and component licenses require review. |
| [glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | MIT | Reproducible optimization and compression of glTF assets. | Applies to 3D assets, not sprites or maps generally. |

## JavaScript game engines

| Repository | License | Evidence and potential use | Main caution |
| --- | --- | --- | --- |
| [PlayCanvas Editor](https://github.com/playcanvas/editor) | MIT | Open editor/engine boundary, web authoring, assets, inspector, publication, reusable UI. | More complex and 3D-oriented than the intended workflow. |
| [Phaser](https://github.com/phaserjs/phaser) | MIT | Mature inventory of scenes, cameras, input, tilemaps, audio, plugins, templates, and onboarding. | Large historically layered 2D engine; not the WebGPU foundation. |
| [Excalibur](https://github.com/excaliburjs/excalibur) | BSD-2-Clause | TypeScript-first DX, partial use, Playwright, visual tests, browser coverage, sandbox, and documentation. | Smaller ecosystem and pre-1.0 evolution. |
| [melonJS](https://github.com/melonjs/melonJS) | MIT | Especially relevant small 2.5D engine: tilemaps, lighting, meshes, zero dependencies, tree shaking, Canvas fallback. | Its 2.5D model and performance limits need direct prototypes. |
| [LittleJS](https://github.com/KilledByAPixel/LittleJS) | MIT | Lower bound for size and API complexity with rendering, input, sound, physics, and no dependencies. | Optimized for compact games rather than a large authoring platform. |
| [GDevelop](https://github.com/4ian/GDevelop) | MIT core with project-specific terms to review | Large open-source no-code authoring reference and cross-platform publishing. | Product and editor complexity far beyond a small engine; license boundaries need inspection. |
| [Cocos Engine](https://github.com/cocos/cocos-engine) | MIT with ecosystem details to review | Large 2D/3D creator/runtime integration and broad platform adaptation. | Native/TypeScript stack and editor coupling do not match browser-first minimalism. |

No evaluated engine should currently be adopted wholesale. Their strongest
subsystems and failure modes are more useful than their top-level APIs.

## Entities and composition

| Repository | License | Evidence and potential use | Main caution |
| --- | --- | --- | --- |
| [bitECS](https://github.com/NateTheGreatt/bitECS) | MIT | Small data-oriented queries, relations, serialization, and hot-path performance. | Numeric IDs and SoA storage impair authoring and debugging if exposed publicly. |
| [Miniplex](https://github.com/hmans/miniplex) | MIT | Ergonomic object entities and queries without imposed scheduler or system model. | Lower activity and less extreme performance focus. |
| [ECSY](https://github.com/ecsyjs/ecsy) | MIT, archived | Historical evidence for world-scoped systems, queries, and GC-conscious design. | Archived; not a dependency candidate. |

Composition does not imply a mandatory public ECS. Data-oriented storage remains
an internal optimization option for demonstrated hot paths.

## Battle and deterministic simulation

| Repository | License | Evidence and potential use | Main caution |
| --- | --- | --- | --- |
| [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) | MIT server/simulator | Generations of battle behavior, data, formats, validation, protocol, logs, tests, and server operation. | Pokémon-specific data/IP must remain separate; architecture has historical scale and special cases. |
| [Pokémon Showdown client](https://github.com/smogon/pokemon-showdown-client) | AGPL-3.0 | Battle UX, replay, protocol, team building, web operation, and client/server separation. | Different license from server; direct reuse is unsuitable without explicit review. |
| [pkmn/engine](https://github.com/pkmn/engine) | MIT | Low-level deterministic battle API, fixed RNG, compact state, protocol logs, WASM, benchmarks, extensive testing. | Heavy development, breaking changes, incomplete generation coverage, and intentionally limited custom rules/mods. |
| [boardgame.io](https://github.com/boardgameio/boardgame.io) | MIT | Turn phases, pure state transitions, logs/time travel, bots, multiplayer, lobby, and view independence. | General turn-based abstraction may be too framework-like and project activity must be verified. |

The principal lesson is separation: battle state transition, legal choices,
ruleset validation, presentation protocol, networking, and UI are different
responsibilities.

## Authoring and project data

| Repository | License | Evidence and potential use | Main caution |
| --- | --- | --- | --- |
| [Tiled](https://github.com/mapeditor/tiled) | GPL-2.0 app; mixed libraries/formats | Primary map reference: layers, objects, tilesets, worlds, properties, terrain, automapping, scripts, exporters. | Do not embed or fork the GPL app casually; untyped custom properties need Lumen schemas. |
| [LDtk](https://github.com/deepnight/ldtk) | MIT | Excellent editor UX, typed entities, level/world model, JSON, and rapid iteration. | Opinionated 2D model; not automatically Lumen's canonical format. |
| [Yarn Spinner](https://github.com/YarnSpinnerTool/YarnSpinner) | MIT | Accessible dialogue language, compiler diagnostics, commands/options, and separated runtime roles. | C#/Unity-centered implementation; reference contracts and UX first. |
| [ink](https://github.com/inkle/ink) / [Inky](https://github.com/inkle/inky) | MIT | Branching narrative, live preview, source-to-JSON compilation, warnings, and versioned story state. | Too powerful and opaque for basic visual events; better as advanced optional narrative. |
| [inkjs](https://github.com/y-lohse/inkjs) | MIT | Viable JavaScript runtime for an optional ink integration. | Can lag upstream ink major versions. |
| [Ajv](https://github.com/ajv-validator/ajv) | MIT | Portable JSON Schema/JTD validation, structured errors, browser/Node, standalone validators. | Code generation/CSP and semantic validation need deliberate handling. |
| [Zod](https://github.com/colinhacks/zod) | MIT | Excellent TypeScript API/config DX and error handling. | Library-specific schemas are weaker as persistent interoperable contracts. |
| [FormatJS](https://github.com/formatjs/formatjs) | MIT by package | ICU messages, plurals, grammar, numbers, dates, parsers, and CLI tooling. | Large ecosystem; use browser Intl and small pieces where possible. |
| [Project Fluent](https://github.com/projectfluent/fluent.js) | Apache-2.0 | Human-readable localization, grammatical variants, references, BiDi, and error recovery. | Smaller current JS ecosystem; requires a focused comparison with ICU. |

## Assets, development, tests, and publishing

| Repository | License | Evidence and potential use | Main caution |
| --- | --- | --- | --- |
| [Pixi AssetPack](https://github.com/pixijs/assetpack) | MIT | Transform pipeline, spritesheets, compression, manifests, and plugin model. | Pixi-oriented; reference before renderer formats are settled. |
| [Vite](https://github.com/vitejs/vite) | MIT | Strong dev server, HMR, build pipeline, plugin API, and ecosystem. | Tooling only; fast major cycle should be encapsulated from projects. |
| [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 | Cross-browser E2E, traces, video, screenshots, emulation, and autonomous visual inspection. | WebGPU and pixel goldens vary by GPU, OS, driver, and fonts. |
| [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) | MIT | Manifest, service worker, offline support, update flow, and asset generation. | Cache/version skew can corrupt experience; requires atomic update policy. |
| [seedrandom](https://github.com/davidbau/seedrandom) | MIT | Seeded PRNG and serializable state reference. | Mature but old; never replace global `Math.random`; algorithm becomes protocol. |
| [Redux](https://github.com/reduxjs/redux) | MIT | Conceptual reference for pure transitions, action logs, replay, and devtools. | Do not turn the engine into one global store. |

## Early eliminations

- **ECSY:** archived; retain only as historical evidence.
- **Lost Pixel:** archived in 2026; do not adopt for visual regression.
- **Pokémon Showdown client:** AGPL and different ownership boundary make direct
  reuse unattractive; study product behavior and protocol only.
- **Full Babylon, PlayCanvas, Phaser, Cocos, or GDevelop adoption:** conflicts
  with the current small-core goal and would inherit large architectural choices
  before Lumen-specific cases exist.
- **Tiled fork or embedded editor:** premature and legally/operationally costly;
  start by testing external integration and typed project overlays.
- **Mandatory ECS:** unsupported by current evidence.

## Missing coverage

- Direct source audits pinned to commits rather than repository-level review.
- Measured 2.5D renderer prototypes and device/browser benchmarks.
- Browser storage, atomic saves, quota, and migration repositories.
- WebGPU fallback and compatibility evidence on real low-end devices.
- Event graph and quest editors beyond dialogue-specific tools.
- Plugin security, permissions, sandboxing, and trustworthy distribution.
- Asset provenance, signing, package registries, and community moderation.
