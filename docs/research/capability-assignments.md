# Scored capability assignments

Snapshot date: 2026-07-11. Scores are 0–5 for the stated role and use the rules
in [scoring.md](scoring.md). `M` means medium confidence from source/repository
inspection; `L` means product-level or incomplete evidence. No score grants
permission to reuse protected data or assets.

## Product and gameplay

| Capability | Primary reference | Score/confidence | Secondary references | Assignment |
| --- | --- | ---: | --- | --- |
| Broad creature-RPG mechanics | pokeemerald-expansion | 5/M | Essentials, Pokémon Showdown | Functional inventory and interaction oracle, not direct code base. |
| Traditional polished campaign | Unbound | 4.5/L | Gaia, Uranium | Product reference for coherent preset and QoL. |
| Long reactive narrative | Rejuvenation | 4.5/L | Reborn | Quest/state stress test. |
| Contextual battlefields | Reborn | 5/L | Rejuvenation | Primary stress test for scoped effects and explanation. |
| Composable campaign modifiers | Insurgence | 4.5/L | Uranium, ROWE, Reborn passwords | Modes as validated rule overlays. |
| Difficulty and team preparation | Radical Red | 4.5/L | Unbound, Reborn | Product reference; architecture not inferred. |
| Open-world progression | Crystal Clear | 4.5/M | ROWE | Milestone queries and scaling policies. |
| Roguelite campaign | Emerald Rogue | 5/M | — | Run/meta separation, generation, seeds, suspend. |
| Derived/compositional creatures | Infinite Fusion | 5/L | Insurgence variants | Lazy provider and asset-provenance stress test. |
| Original bestiary production | Uranium | 4.5/L | Sage, Xenoverse | Creator data/asset workflow reference. |
| Player bases and spaces | Insurgence | 4.5/L | Crystal Clear | Map + decoration + services + sharing model. |
| Side activities/crafting | Prism | 4.5/M | PSDK | Extensible activities, inventories, and currencies. |
| Challenge/randomizer rules | Infinite Fusion | 4.5/L | Insurgence, Uranium, ROWE | Domain-specific composable randomization. |
| Online trading/gifts | Uranium | 4/L | Insurgence, Showdown | Product behavior and service-longevity warning. |
| Battle facilities/sandbox | Unbound | 4.5/L | pokeemerald-expansion, Showdown | Test bench and postgame product reference. |
| Creator accessibility | Pokémon Essentials | 5/M | RPG Maker, PSDK/Studio | Requirements source, not architecture. |

## Runtime and rendering

| Capability | Primary reference | Score/confidence | Secondary references | Assignment |
| --- | --- | ---: | --- | --- |
| WebGPU correctness | GPUWeb + samples | 5/M | WebGPU Fundamentals | Authoritative behavior and fixtures. |
| Device/backend abstraction | PlayCanvas | 5/M | Babylon, Pixi | Primary design reference; no full adoption. |
| Sprite/atlas batching | PixiJS | 5/M | melonJS, LittleJS | Primary implementation reference and spike source. |
| 2.5D world semantics | melonJS | 5/M | Phaser, Tiled | Primary product reference; no WebGPU base. |
| Static tile layers | Lumen texture-layer spike | 4/M | Phaser GPU layer, Pixi Tilemap | Candidate path selected per layer semantics. |
| Dynamic/interleaved tiles | Lumen instancing spike | 4/M | Pixi, PlayCanvas | Candidate for per-tile depth/transforms. |
| Camera/depth/billboards | PlayCanvas | 4.5/M | Three.js, Babylon | Reference for hybrid 2.5D composition. |
| Shader/material correctness | GPUWeb/WGSL | 5/M | Babylon, Three nodes | Direct WGSL first. |
| Rendering robustness | Babylon.js | 5/M | PlayCanvas | Adversarial oracle, not dependency. |
| GPU profiling | PlayCanvas/Babylon | 4.5/M | stats-gl | Debug/profiler builds and conditional timestamps. |
| Texture compression | Basis/KTX | 4/M | Pixi AssetPack | Optional asset path after measured need. |
| 3D asset transforms | glTF-Transform | 4.5/M | PlayCanvas loaders | Tooling candidate when 3D assets appear. |
| Minimal engine surface | LittleJS | 4/M | melonJS, Excalibur | Complexity lower bound only. |

## Simulation, data, and persistence

| Capability | Primary reference | Score/confidence | Secondary references | Assignment |
| --- | --- | ---: | --- | --- |
| Battle rule coverage | Pokémon Showdown | 5/M | pokeemerald-expansion | Oracle and differential target, not dependency. |
| Compact deterministic kernel | pkmn/engine | 5/M | Showdown | Boundary/performance/testing reference. |
| Turn/action state model | boardgame.io | 4/M | Redux concepts | Redaction/network/plugin contrast only. |
| Replay/input log | Pokémon Showdown | 5/M | pkmn, Lumen spike | Seed + versions/hashes + validated inputs. |
| Fixed RNG testing | pkmn/engine | 5/M | Lumen spike | Scripted frames and named streams. |
| Persistent structural schemas | JSON Schema + Ajv | 5/M | Zod | Ajv dependency candidate validated. |
| Semantic references | Lumen schema spike | 4/M | LDtk IDs | Separate validator layer required. |
| Browser saves | IndexedDB + idb | 4.5/M | native IDB | Dependency candidate validated in three engines. |
| Large local binary storage | OPFS | 4/M | IDB blobs | Optional capability, no baseline dependency. |
| Portable backups | File input/Blob download | 5/M | File System Access | Native universal path plus enhancement. |
| Save migration discipline | Essentials/Prism lessons | 4/M | Lumen generation spike | Lumen-owned fixtures and transactional process. |
| Cloud synchronization | No implementation selected | 0 | Uranium product behavior | External service; research when requirement exists. |

## Authoring and tooling

| Capability | Primary reference | Score/confidence | Secondary references | Assignment |
| --- | --- | ---: | --- | --- |
| External map authoring | Tiled | 5/M | LDtk | Adapter first; do not embed GPL editor. |
| Map-editor UX/model | LDtk | 4.5/M | Tiled, RPG Maker | Future editor reference, not canonical schema. |
| Dialogue compiler/VM | Yarn Spinner | 5/M | ink/Inky | Conceptual primary; no C# dependency. |
| Advanced branching narrative | ink/inkjs | 4/M | Yarn | Optional future module. |
| General events/quests | No adequate JS base | 0 | RPG Maker/Essentials behavior | Design only from concrete cases. |
| Localization | FormatJS/ICU and Fluent | 4/L | browser Intl | Usability spike required before selection. |
| Asset pipeline | Pixi AssetPack | 3.5/M | glTF-Transform, Basis/KTX | Reference until concrete asset formats exist. |
| Development server/build | Vite | 5/M | native ESM | Validated tooling dependency. |
| Browser E2E/traces | Playwright | 5/M | Excalibur practices | Validated tooling dependency. |
| Visual regression | Playwright + fixed fixtures | 4/M | Babylon tests | Metrics/semantics before broad goldens. |
| Format/lint | Biome | 4.5/M | ESLint | Validated unified tool, exact version. |
| JavaScript static analysis | TypeScript checkJs | 4.5/M | editor JSDoc | Validated without changing runtime language. |
| Unit tests | Node test runner | 4.5/M | — | Validated zero-dependency baseline. |

## Platform and distribution

| Capability | Primary reference | Score/confidence | Secondary references | Assignment |
| --- | --- | ---: | --- | --- |
| Keyboard/pointer/gamepad | Browser standards | 5/M | WPT | Native adapters; no runtime dependency. |
| Audio | Web Audio | 5/M | autoplay guidance | Native wrapper after real cases. |
| Lifecycle/background | Visibility + pagehide/pageshow | 5/M | bfcache guidance | Native behavior and explicit recovery. |
| Resize/DPR | CSS + ResizeObserver | 5/M | VisualViewport later | Native pixel-budget model. |
| Accessibility | DOM + WCAG 2.2 | 5/M | axe-core future spike | Contract and QA requirement. |
| Capability tiers | GPUWeb features/limits + benchmark | 4.5/M | user safe mode | No UA/device model gating. |
| Package distribution | npm ESM | 5/M | — | No custom package manager. |
| Reproducible resolution | package-lock + npm ci | 5/M | — | One authoritative lock. |
| Official provenance | npm OIDC/provenance | 5/M | registry signatures | Required when publishing begins. |
| Trusted module execution | direct ESM + injected capability | 4.5/M | object-capability patterns | Official/reviewed tier only. |
| Untrusted browser plugin | cross-origin sandboxed iframe | 4/M | SES future spike | Not part of v1 until demanded. |
| Untrusted editor plugin | process isolation | 3/L | SES | No promise in initial editor. |
| Web/PWA export | static Vite build | 4.5/M | service worker later | PWA deferred until atomic update policy. |

## Consolidated selections

Validated environment candidates: Vite, Playwright, Biome, TypeScript checkJs,
Ajv, and `idb`. The first four are tooling; Ajv and `idb` remain runtime
candidates until production boundaries exist.

Rejected as full foundations: PlayCanvas, PixiJS, Babylon, Phaser, melonJS,
Pokémon Showdown, pkmn/engine, boardgame.io, Tiled embedded/forked, any mandatory
ECS, and a custom package manager. Their assigned roles remain reference,
oracle, adapter, or focused spike.

## Confidence limit

High-confidence adoption still requires pinned local source audits plus
executable consumer prototypes for the exact integration. Physical-device and
assistive-technology properties cannot be promoted above medium confidence from
repository inspection or emulation.
