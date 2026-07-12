# Executable capability matrix

Status: authoritative Phase 6 traceability index, 2026-07-12.

This matrix assigns every bullet in `capabilities.md` to delivery work. Row text
is intentionally identical to the taxonomy so `architecture.test.js` can prove
complete, unique coverage. A row assigns ownership; it does not claim the
capability is implemented.

Role abbreviations: `C` core contract, `O` official preset system, `P` platform
adapter/presentation, `T` creator tooling, `M` optional module, `X` project
extension, and `S` external service. Runtime/authoring names are target owners,
not current public packages. Evidence is the minimum proof beyond unit tests.

| ID | Capability | Primary reference | Role | Runtime / authoring owner | Evidence target | Goal | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAP-CJ-01 | Project creation, templates, presets, samples, and guided onboarding. | Essentials, RPG Maker, Phaser | O/T | preset assembly / workbench | newcomer creates original chapter | 14 | Planned |
| CAP-CJ-02 | Immediate preview, focused playtest, reload, and reproducible builds. | Essentials debug, Vite, Playwright | T | test harness / workbench | focused and clean builds agree | 14/17 | Planned |
| CAP-CJ-03 | Validation, actionable errors, diagnostics, and contextual documentation. | Studio, Tuxemon, JSON Schema | C/T | diagnostics / workbench | seeded failures resolved by creators | 6/14 | Active |
| CAP-CJ-04 | Packaging, web publishing, updates, backups, and project migration. | npm, Vite, browser APIs | T/P | distribution / release tooling | clean external ship and upgrade | 12/19 | Planned |
| CAP-CJ-05 | Git-friendly collaboration, localization, and content pipelines. | Tuxemon, Fluent/ICU, AssetPack | T | compiler / workbench | two-author localized scale fixture | 14/17 | Planned |
| CAP-WE-01 | Connected maps, interiors, regions, layers, elevations, and transitions. | Tiled, LDtk, melonJS | O/T | world / world tools | multi-region production fixture | 10 | Planned |
| CAP-WE-02 | Tile, object, freeform, 2D, 2.5D, and hybrid scene authoring. | Tiled, LDtk, PlayCanvas | O/P/T | world+scene / world tools | distinct scene fixtures and round trip | 10/13 | Planned |
| CAP-WE-03 | Terrain semantics, collisions, navigation, ledges, slopes, bridges, and stairs. | melonJS, Tiled, Phaser | O/T | world / world tools | adversarial traversal corpus | 10 | Planned |
| CAP-WE-04 | Walking, running, jumping, swimming, diving, climbing, riding, and fast travel. | pokeemerald-expansion, Essentials | O | world movement / world tools | capability-composed traversal fixture | 10 | Planned |
| CAP-WE-05 | Random, visible, conditional, scripted, and generated encounters. | Essentials, pokeemerald-expansion | O/M | encounter / encounter tools | two encounter policies plus generation | 10/16 | Planned |
| CAP-WE-06 | Day/night, calendars, weather, seasons, world state, and environmental effects. | Essentials, Reborn, Prism | O | world time / event tools | deterministic time/weather replay | 10 | Planned |
| CAP-WE-07 | Followers, companions, interactables, hidden objects, puzzles, and secrets. | Essentials, Unbound | O/X | world+events / world tools | multi-map puzzle and follower fixture | 7/10 | Planned |
| CAP-WE-08 | Linear, branching, open-world, procedural, and multi-region structures. | Unbound, Crystal Clear, Emerald Rogue | O/M | campaign structure / workbench | traditional+open+generated games | 16/18 | Planned |
| CAP-NE-01 | Flags, variables, conditions, commands, reusable events, and state machines. | RPG Maker, Essentials, Yarn | C/O/T | events / event editor | branching chapter deterministic replay | 7 | Planned |
| CAP-NE-02 | Dialogue, choices, portraits, expressions, text effects, and localization. | Yarn Spinner, ink, Essentials | O/P/T | narrative / event editor | localized branching chapter | 7 | Planned |
| CAP-NE-03 | Cutscenes, camera direction, choreography, timing, audio, and transitions. | RPG Maker, Yarn, browser media | O/P/T | events+presentation / cutscene editor | skip/interruption-safe cutscene fixture | 7/13 | Planned |
| CAP-NE-04 | Chapters, quests, objectives, journals, markers, rewards, and failure states. | Essentials behavior, Rejuvenation | O/T | quests / quest editor | long branching quest graph | 7 | Planned |
| CAP-NE-05 | Relationships, factions, consequences, branches, endings, and New Game+. | Rejuvenation, Reborn, ink | O/X | campaign state / quest editor | divergent endings and NG+ migration | 7/11 | Planned |
| CAP-NE-06 | Temporary parties, partner characters, mid-battle events, and world mutations. | Essentials, Reborn | O | events via typed capabilities / event editor | cross-system event provenance | 7/9 | Planned |
| CAP-NE-07 | Event inspection, breakpoints, stepping, state editing, and dependency tracing. | RPG Maker debug, Essentials debug | T | event debugger / workbench | creator diagnoses seeded causal fault | 7/14 | Planned |
| CAP-CC-01 | Species, forms, variants, generated forms, and compositional systems. | pokeemerald-expansion, Infinite Fusion | O/M | creature providers / database tools | static+lazy 1,000-form fixture | 8/16 | Planned |
| CAP-CC-02 | Types, stats, growth, abilities, learnsets, evolutions, breeding, and inheritance. | pokeemerald-expansion, Showdown | O | creature rules / database tools | conformance and graph corpus | 8/9 | Planned |
| CAP-CC-03 | Capture, ownership, parties, storage, trading, release, and transfer. | Essentials, Uranium | O/S | collection; trading service / collection tools | complete offline lifecycle; service gated | 8/20 | Planned |
| CAP-CC-04 | Metadata, encyclopedia entries, habitats, rarity, forms, and discovery state. | Essentials, Tuxemon | O/T | collection / database tools | large searchable bestiary | 8 | Planned |
| CAP-CC-05 | Sprites or models, icons, palettes, sounds, animation sets, and overworld forms. | pokeemerald-expansion, Uranium | O/P/T | presentation providers / asset tools | missing/fallback/provenance fixtures | 8/13 | Planned |
| CAP-CC-06 | Original creature workflows and project-defined data extensions. | Uranium, Sage, Tuxemon | T/X | extension data / database tools | original bestiary creator trial | 8/14 | Planned |
| CAP-BS-01 | Single, double, multi-actor, asymmetric, consecutive, horde, and boss battles. | pokeemerald-expansion, Showdown | O | battle / battle tools | mode-composition conformance corpus | 9 | Planned |
| CAP-BS-02 | Turn phases, action ordering, targeting, switching, capture, escape, and defeat. | pkmn/engine, Showdown | C/O | battle kernel / battle tools | exact ordering/replacement corpus | 9 | Planned |
| CAP-BS-03 | Damage, types, moves, abilities, items, statuses, weather, terrain, and fields. | Showdown, pokeemerald-expansion, Reborn | O | battle effects / effect tools | differential+intentional-difference corpus | 9 | Planned |
| CAP-BS-04 | Transformations, temporary forms, team-wide effects, and project mechanics. | Showdown, Insurgence | O/X | battle effects / effect tools | extension without kernel fork | 9/15 | Planned |
| CAP-BS-05 | Trainer definitions, team generation, scaling, rulesets, and battle facilities. | Radical Red, Unbound, Showdown | O/M/T | battle policy / trainer tools | campaign+facility fixtures | 9/11 | Planned |
| CAP-BS-06 | AI profiles, difficulty, tactical evaluation, legal actions, and deterministic RNG. | Showdown, pkmn/engine | O/T | battle AI / AI tools | explainable fixed-budget AI suite | 9 | Planned |
| CAP-BS-07 | Battle scripting, animation timelines, logs, replays, simulation, and debugging. | Showdown, pkmn/engine, Essentials | O/P/T | battle+presentation / battle tools | replay divergence and focused battle | 9/13 | Planned |
| CAP-BS-08 | PvP validation, synchronization, spectators, rankings, and anti-cheat boundaries. | Showdown, boardgame.io | S/C | battle protocol / service tooling | owned threat-modeled service only | 20 | Gated |
| CAP-PE-01 | Experience, levels, caps, scaling, training, respec, and grind reduction. | pokeemerald-expansion, Radical Red | O | progression / progression tools | two progression policies | 8/11 | Planned |
| CAP-PE-02 | Milestones, access abilities, reputation, achievements, and unlocks. | Crystal Clear, Unbound | O | campaign progression / graph tools | linear+open completion analysis | 11 | Planned |
| CAP-PE-03 | Inventory, equipment, currencies, shops, crafting, loot, and item discovery. | pokeemerald-expansion, Prism | O/M | economy / economy tools | transaction and balance simulation | 11 | Planned |
| CAP-PE-04 | Collections, regional completion, rewards, rematches, and postgame progression. | Unbound, Essentials | O | campaign progression / graph tools | complete postgame fixture | 11/18 | Planned |
| CAP-PE-05 | Save slots, autosave, checkpoints, migrations, cloud sync, and recovery. | IndexedDB, Essentials/Prism lessons | O/P/S/T | saves; optional cloud / save tools | failure injection+version history | 12/20 | Planned |
| CAP-GS-01 | Traditional campaigns, open worlds, episodes, and multiple campaigns. | Unbound, Crystal Clear, Rejuvenation | O/M | campaign assembly / workbench | three complete proof games | 16/18 | Planned |
| CAP-GS-02 | Difficulty presets and independent battle, puzzle, and accessibility settings. | Radical Red, Unbound | O/P | policy overlays / settings tools | independent settings matrix | 11/13 | Planned |
| CAP-GS-03 | Nuzlocke, randomizer, ironman, monotype, solo, and custom challenge rules. | Infinite Fusion, Insurgence, ROWE | M/X | challenge policies / ruleset tools | composable deterministic overlays | 11/16 | Planned |
| CAP-GS-04 | Roguelite runs, seeds, generation, hubs, metaprogression, and daily challenges. | Emerald Rogue | M | run/meta systems / run tools | deterministic divergent game | 16/18 | Planned |
| CAP-GS-05 | Sandbox, boss rush, battle frontier, tournaments, rematches, and New Game+. | Unbound, Showdown | M/O | facility/campaign policies / tools | facility and NG+ fixture | 9/16 | Planned |
| CAP-SS-01 | Bases, housing, decoration, farming, berries, daycare, and breeding. | Insurgence, Crystal Clear | M | side-system modules / module tools | one complete compositional module | 16 | Planned |
| CAP-SS-02 | Contests, safari, fishing, mining, casinos, races, photography, and minigames. | Prism, pokeemerald-expansion | M/X | side-system modules / module tools | second structurally distinct module | 16 | Planned |
| CAP-SS-03 | Phone, schedules, daily events, swarms, gifts, news, and live events. | Essentials, Prism | O/M/S | schedules; live service / event tools | offline schedules; services gated | 7/16/20 | Planned |
| CAP-SS-04 | Character appearance, outfits, profiles, achievements, and statistics. | Insurgence, Uranium | M/O | profile/presentation / database tools | save+migration+theme fixture | 13/16 | Planned |
| CAP-OC-01 | Direct and asynchronous trades, random trades, and offer markets. | Uranium, Showdown contrast | S | trading protocol/service / ops tools | owned privacy+abuse+shutdown plan | 20 | Gated |
| CAP-OC-02 | Direct and asynchronous battles, shared teams, replays, and seeds. | Showdown | S/C | battle protocol/service / ops tools | versioned service conformance | 20 | Gated |
| CAP-OC-03 | Mystery gifts, events, leaderboards, cloud saves, and cross-game transfer. | Uranium product behavior | S | optional services / ops tools | lifecycle and data-export proof | 20 | Gated |
| CAP-OC-04 | Visiting bases, cooperative play, races, servers, moderation, and protocol versions. | Insurgence, boardgame.io contrast | S | optional services / ops tools | threat/moderation/failure review | 20 | Gated |
| CAP-OC-05 | Offline behavior, service failure, longevity, privacy, and operational ownership. | research service finding | C/S | offline contracts / ops tools | service closure leaves games playable | 20 | Gated |
| CAP-PA-01 | Cameras, lighting, shadows, particles, water, reflections, and post-processing. | PlayCanvas, Babylon, GPUWeb | P | renderer / presentation tools | tiered visual+performance fixtures | 13 | Planned |
| CAP-PA-02 | Battle scenes, environment-aware visuals, animation, and configurable shaders. | PlayCanvas, Reborn, WGSL | P | battle presentation / timeline tools | simulation-independent visual replay | 13 | Planned |
| CAP-PA-03 | UI themes, responsive layouts, touch, keyboard, mouse, and controllers. | browser standards, WCAG | P | UI+input adapters / theme tools | real-device interaction tiers | 13 | Planned |
| CAP-PA-04 | Layered music, ambience, effects, mixing, spatial audio, and voice. | Web Audio | P | audio adapter / audio tools | interruption/routing/device sessions | 13 | Planned |
| CAP-PA-05 | Remapping, text and motion settings, color and audio alternatives, and assists. | WCAG 2.2, browser semantics | P/O | settings/accessibility / workbench | selected real AT sessions | 13 | Planned |
| CAP-PA-06 | Capability detection and graceful degradation across web devices. | GPUWeb, browser APIs | C/P | capability registry / diagnostics | declared real-device tiers | 13/19 | Planned |
| CAP-AT-01 | Map, terrain, collision, encounter, navigation, and world-connection editors. | Tiled, LDtk | T | world tools | scale authoring and round trip | 10/14 | Planned |
| CAP-AT-02 | Event, dialogue, cutscene, quest, schedule, and relationship editors. | RPG Maker, Yarn, Studio | T | event tools | branching chapter creator trial | 7/14 | Planned |
| CAP-AT-03 | Creature, type, move, ability, item, trainer, encounter, and evolution databases. | Essentials PBS, Studio | T | database tools | 1,000-row bulk/refactor trial | 8/14 | Planned |
| CAP-AT-04 | Battle, AI, animation, effect, progression, economy, and ruleset editors. | Showdown tools, Essentials debug | T | system-specific tools | focused simulation/balance trial | 9/11/14 | Planned |
| CAP-AT-05 | Asset import, conversion, atlases, compression, previews, and dependency tracking. | AssetPack, glTF-Transform, KTX | T/P | asset pipeline / workbench | reproducible provenance-aware build | 13/14 | Planned |
| CAP-AT-06 | Schema-driven forms, raw data access, bulk editing, search, and safe refactors. | Studio, JSON Schema | T | workbench | lossless raw/form round trip | 14 | Planned |
| CAP-AT-07 | Undo/redo, history, recovery, validation, migrations, and merge-friendly storage. | Essentials lessons, Git | T | workbench+transactions | crash/concurrency/two-author trial | 12/14/17 | Planned |
| CAP-AT-08 | Runtime inspectors, overlays, teleportation, state editing, test battles, and replays. | Essentials debug, Showdown logs | T | debug harness / workbench | seeded fault diagnosis trial | 7/9/14 | Planned |
| CAP-AT-09 | Plugin discovery, permissions, compatibility, updates, templates, and documentation. | Essentials plugins, npm ESM | C/T | module contracts / workbench | external-shaped module lifecycle | 15 | Planned |
| CAP-EO-01 | Explicit lifecycle, time, resources, input, rendering, audio, and persistence. | browser standards, PlayCanvas | C/P | core contracts+adapters / diagnostics | architecture and lifecycle tests | 6/13 | Active |
| CAP-EO-02 | Determinism, unit tests, property tests, integration tests, and visual regression. | pkmn/engine, Playwright | C/T | test contracts / CI | scale fuzz/replay/visual corpus | 17 | Planned |
| CAP-EO-03 | Performance budgets, profiling, traces, memory inspection, and device coverage. | PlayCanvas/Babylon inspectors | P/T | telemetry / workbench | recorded scale and real-device tiers | 13/17 | Planned |
| CAP-EO-04 | Versioned schemas, migrations, compatibility ranges, and deprecation policy. | JSON Schema, npm semver | C/T | compatibility / migration tools | multi-version fixture history | 12/15/19 | Planned |
| CAP-EO-05 | Crash reports, structured logs, reproducible diagnostics, and privacy controls. | Playwright traces, browser APIs | C/T | diagnostics / workbench | privacy-reviewed diagnostic bundle | 17/19 | Planned |
| CAP-EO-06 | License, attribution, provenance, dependency, and distribution records. | SPDX, npm provenance | T | release/provenance tooling | clean verified supported release | 17/19 | Planned |

## Status meaning

- `Proven`: current repository evidence satisfies the full row, including
  authoring and scale—not merely a small precursor.
- `Active`: Phase 6 currently defines or protects the cross-cutting contract.
- `Planned`: assigned to an ordered goal with no completion claim.
- `Gated`: requires named owner/external/service evidence before implementation
  or support claims.

No row is currently `Proven` at its full Essentials-class scope. Existing
experiments are evidence inputs recorded in their own completion audits.
