# Initial capability matrix

This matrix records demonstrated product references, not implementation
endorsements. A blank cell means "not yet evaluated", not "unsupported".

| Capability family | Strong initial references | Evidence to extract next |
| --- | --- | --- |
| Contextual battle rules | Reborn, Rejuvenation, pokeemerald-expansion | Effect lifecycle, conflicts, UI explanation, tests. |
| Broad battle mechanics | pokeemerald-expansion, CFRU, Pokémon Showdown | Data model, ordering, determinism, validation. |
| Competitive difficulty | Radical Red, Unbound, Reborn | AI policy, team fixtures, caps, low-friction preparation. |
| Campaign difficulty | Unbound, Insurgence, Rejuvenation | Independent profiles for battle, economy, puzzles, and information. |
| Challenge rules | Insurgence, Uranium, ROWE, Infinite Fusion | Composable overlays, conflicts, save compatibility. |
| Open-world progression | Crystal Clear, ROWE | Milestone queries, scaling policies, dependency visualization. |
| Quests and long narrative | Rejuvenation, Reborn, Unbound | Quest graphs, persistent consequences, inspection and migration. |
| Traditional campaign polish | Gaia, Unbound, Uranium | Reusable event vocabulary, pacing tools, cinematics and puzzles. |
| Creature variants | Insurgence, Rejuvenation, Uranium | Derived forms, context, inheritance, asset and data overrides. |
| Compositional creatures | Infinite Fusion | Providers, lazy materialization, cache, provenance and fallback. |
| Roguelite structure | Emerald Rogue | Seeded generation, run/meta state, suspend and replay. |
| Bases and player spaces | Insurgence, Crystal Clear | Map ownership, decoration, services and sharing. |
| Crafting and activities | Prism, PSDK | Extensible inventories, currencies, minigame/activity lifecycle. |
| Online services | Uranium, Insurgence, Pokémon Showdown | Protocol versions, validation, offline degradation, operations. |
| Human-readable game data | Essentials PBS, Tuxemon | Schemas, round trip, stable IDs, validation and compilation cache. |
| Visual data authoring | Pokémon Studio, RPG Maker | Shared schemas, forms, bulk editing, undo and migrations. |
| Map authoring | RPG Maker, Tiled, PSDK, RPG Paper Maker | Terrain semantics, events, preview, import and 2.5D UX. |
| Event authoring | RPG Maker, Essentials, Pokémon Studio v3 vision | No-code flow, reusable commands, references and debugging. |
| Plugin ecosystem | Essentials, RPG Maker, Tuxemon | Dependency graph, compatibility, permissions, updates and isolation. |
| Debugging | Essentials, Tuxemon, pokeemerald-expansion | State edit, teleport, focused tests, inspectors and structured logs. |
| Upgrades and migrations | Essentials, pokeemerald-expansion, Prism | Dry run, backup, transactional migration and compatibility report. |
| Web publishing | RPG Maker MZ, browser engines (research pending) | Asset graph, offline behavior, budgets and device diagnostics. |
| 2.5D presentation | RPG Paper Maker, WebGPU projects (research pending) | Camera, batching, lighting, shaders, tooling and device fallback. |

## Architectural stress tests

Future proposals should be tested against three deliberately different cases:

1. **Reborn:** express contextual battle fields and a long reactive campaign
   without hard-coded special cases.
2. **Insurgence:** compose many optional systems and services without turning a
   project into a monolith.
3. **Infinite Fusion:** represent enormous derived content without materializing
   every possible result.

A beginner preset must remain approachable while satisfying these tests.
