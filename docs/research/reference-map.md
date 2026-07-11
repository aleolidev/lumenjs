# Preliminary technical reference map

This map identifies what to study next. "Primary" means best current reference
for a need, not a dependency selection or permission to reuse code.

| LumenJS need | Primary references | Contrasts | Current conclusion |
| --- | --- | --- | --- |
| WebGPU correctness | GPUWeb, WebGPU Samples, WebGPU Fundamentals | Browser implementations | Follow standards and validate features/limits explicitly. |
| Frame graph and backend design | PlayCanvas | Bevy/wgpu, Babylon | Study concepts; build only after measured Lumen cases. |
| Sprites, atlases, batching | PixiJS | melonJS, LittleJS | Specialized 2D path within a hybrid 2.5D renderer. |
| Tile rendering | Pixi Tilemap, Phaser GPU tile layer | melonJS, Tiled | Prototype instanced geometry versus texture-backed layers. |
| Camera, depth, billboards | PlayCanvas, Three.js | Babylon | Real depth with orthographic/perspective camera and batched sprites. |
| Shaders and materials | GPUWeb/WGSL, Babylon | Three nodes/TSL | Prefer direct WGSL initially; avoid translation layers without need. |
| Texture/3D asset optimization | Basis/KTX, glTF-Transform | Pixi AssetPack | Optional reproducible transforms; preserve editable sources. |
| Renderer profiling | stats-gl, PlayCanvas/Babylon inspectors | WebGPU queries | Report phases, calls, uploads, caches, memory, and conditional GPU time. |
| Small engine boundary | LittleJS, melonJS | Excalibur | Keep the core compact without optimizing only for code golf. |
| Engine/editor separation | PlayCanvas Engine/Editor | Pokémon Studio/PSDK | Runtime and project format must work independently of editor. |
| Beginner onboarding | Phaser, RPG Maker | GDevelop, Excalibur | Presets, examples, focused playtest, and errors matter more than assembly freedom. |
| Map authoring | Tiled | LDtk, RPG Maker | Integrate and validate externally before building a full editor. |
| Persistent schemas | JSON Schema + Ajv | Zod | Portable schemas first; separate semantic validators. |
| Dialogue | Yarn Spinner | ink/Inky | Simple dialogue contract plus optional advanced narrative module. |
| Events and quests | RPG Maker/Essentials behavior | No strong JS OSS base found | Design from real cases; do not import a mediocre framework. |
| Localization | FormatJS/ICU, Fluent | Browser Intl | Run a focused author/localizer usability spike. |
| Deterministic battle | pkmn/engine | Pokémon Showdown | Pure step/legal-choice/log boundaries with injected clock/RNG. |
| Rules and validation | Pokémon Showdown | pokeemerald-expansion | Rulesets are composable data plus hooks; explanation is mandatory. |
| Turn-based networking | boardgame.io, Showdown protocol | Custom services | Keep simulation independent from transport and operations. |
| Entity composition | Miniplex | bitECS | Public model should remain inspectable; optimize storage only when measured. |
| Autonomous browser QA | Playwright, Excalibur tests | Babylon visual tests | Headless simulation plus fixed-environment visual checks and traces. |
| Development server/build | Vite | Direct browser modules | Encapsulate Vite as tooling, never runtime architecture. |
| PWA/offline export | vite-plugin-pwa | Browser APIs | Defer until atomic asset/update/save policy exists. |

## Candidate spikes before architecture

1. Render the same 2.5D scene using instanced/atlas geometry and a texture-backed
   tile layer; measure CPU, GPU, uploads, memory, and visual constraints.
2. Validate a small project schema in Node and browser with Ajv, including a
   plugin-provided schema and a cross-reference semantic error.
3. Model a deterministic battle step with legal choices, fixed RNG frames,
   structured effect provenance, replay, and an explanation inspector.
4. Round-trip a map through Tiled plus Lumen-specific typed metadata and launch
   focused playtest at a selected position/event.
5. Compare Yarn-like dialogue with a minimal visual event graph and an inkjs
   advanced module without conflating dialogue and world events.
6. Run one visual fixture through Chromium, Firefox, and WebKit with Playwright;
   determine which checks are semantic, metric, or pixel-based.

These spikes gather evidence. They do not imply the start of engine
implementation or a settled `src` layout.
