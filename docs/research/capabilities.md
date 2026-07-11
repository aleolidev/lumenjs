# Capability taxonomy

This is an intentionally broad inventory derived from ambitious fangames, ROM
hacks, creation kits, and adjacent tools. Presence here does not mean a feature
belongs in the LumenJS core or first release.

## Creator journey

- Project creation, templates, presets, samples, and guided onboarding.
- Immediate preview, focused playtest, reload, and reproducible builds.
- Validation, actionable errors, diagnostics, and contextual documentation.
- Packaging, web publishing, updates, backups, and project migration.
- Git-friendly collaboration, localization, and content pipelines.

## World and exploration

- Connected maps, interiors, regions, layers, elevations, and transitions.
- Tile, object, freeform, 2D, 2.5D, and hybrid scene authoring.
- Terrain semantics, collisions, navigation, ledges, slopes, bridges, and stairs.
- Walking, running, jumping, swimming, diving, climbing, riding, and fast travel.
- Random, visible, conditional, scripted, and generated encounters.
- Day/night, calendars, weather, seasons, world state, and environmental effects.
- Followers, companions, interactables, hidden objects, puzzles, and secrets.
- Linear, branching, open-world, procedural, and multi-region structures.

## Narrative and events

- Flags, variables, conditions, commands, reusable events, and state machines.
- Dialogue, choices, portraits, expressions, text effects, and localization.
- Cutscenes, camera direction, choreography, timing, audio, and transitions.
- Chapters, quests, objectives, journals, markers, rewards, and failure states.
- Relationships, factions, consequences, branches, endings, and New Game+.
- Temporary parties, partner characters, mid-battle events, and world mutations.
- Event inspection, breakpoints, stepping, state editing, and dependency tracing.

## Creatures and collections

- Species, forms, variants, generated forms, and compositional systems.
- Types, stats, growth, abilities, learnsets, evolutions, breeding, and inheritance.
- Capture, ownership, parties, storage, trading, release, and transfer.
- Metadata, encyclopedia entries, habitats, rarity, forms, and discovery state.
- Sprites or models, icons, palettes, sounds, animation sets, and overworld forms.
- Original creature workflows and project-defined data extensions.

## Battle and simulation

- Single, double, multi-actor, asymmetric, consecutive, horde, and boss battles.
- Turn phases, action ordering, targeting, switching, capture, escape, and defeat.
- Damage, types, moves, abilities, items, statuses, weather, terrain, and fields.
- Transformations, temporary forms, team-wide effects, and project mechanics.
- Trainer definitions, team generation, scaling, rulesets, and battle facilities.
- AI profiles, difficulty, tactical evaluation, legal actions, and deterministic RNG.
- Battle scripting, animation timelines, logs, replays, simulation, and debugging.
- PvP validation, synchronization, spectators, rankings, and anti-cheat boundaries.

## Progression and economy

- Experience, levels, caps, scaling, training, respec, and grind reduction.
- Milestones, access abilities, reputation, achievements, and unlocks.
- Inventory, equipment, currencies, shops, crafting, loot, and item discovery.
- Collections, regional completion, rewards, rematches, and postgame progression.
- Save slots, autosave, checkpoints, migrations, cloud sync, and recovery.

## Game structures and replayability

- Traditional campaigns, open worlds, episodes, and multiple campaigns.
- Difficulty presets and independent battle, puzzle, and accessibility settings.
- Nuzlocke, randomizer, ironman, monotype, solo, and custom challenge rules.
- Roguelite runs, seeds, generation, hubs, metaprogression, and daily challenges.
- Sandbox, boss rush, battle frontier, tournaments, rematches, and New Game+.

## Side systems

- Bases, housing, decoration, farming, berries, daycare, and breeding.
- Contests, safari, fishing, mining, casinos, races, photography, and minigames.
- Phone, schedules, daily events, swarms, gifts, news, and live events.
- Character appearance, outfits, profiles, achievements, and statistics.

## Online and community

- Direct and asynchronous trades, random trades, and offer markets.
- Direct and asynchronous battles, shared teams, replays, and seeds.
- Mystery gifts, events, leaderboards, cloud saves, and cross-game transfer.
- Visiting bases, cooperative play, races, servers, moderation, and protocol versions.
- Offline behavior, service failure, longevity, privacy, and operational ownership.

## Presentation and accessibility

- Cameras, lighting, shadows, particles, water, reflections, and post-processing.
- Battle scenes, environment-aware visuals, animation, and configurable shaders.
- UI themes, responsive layouts, touch, keyboard, mouse, and controllers.
- Layered music, ambience, effects, mixing, spatial audio, and voice.
- Remapping, text and motion settings, color and audio alternatives, and assists.
- Capability detection and graceful degradation across web devices.

## Authoring tools

- Map, terrain, collision, encounter, navigation, and world-connection editors.
- Event, dialogue, cutscene, quest, schedule, and relationship editors.
- Creature, type, move, ability, item, trainer, encounter, and evolution databases.
- Battle, AI, animation, effect, progression, economy, and ruleset editors.
- Asset import, conversion, atlases, compression, previews, and dependency tracking.
- Schema-driven forms, raw data access, bulk editing, search, and safe refactors.
- Undo/redo, history, recovery, validation, migrations, and merge-friendly storage.
- Runtime inspectors, overlays, teleportation, state editing, test battles, and replays.
- Plugin discovery, permissions, compatibility, updates, templates, and documentation.

## Engineering and operations

- Explicit lifecycle, time, resources, input, rendering, audio, and persistence.
- Determinism, unit tests, property tests, integration tests, and visual regression.
- Performance budgets, profiling, traces, memory inspection, and device coverage.
- Versioned schemas, migrations, compatibility ranges, and deprecation policy.
- Crash reports, structured logs, reproducible diagnostics, and privacy controls.
- License, attribution, provenance, dependency, and distribution records.

## Open classification questions

- What is the smallest useful core shared by all intended projects?
- Which official preset defines the approachable fangame experience?
- Which capabilities require runtime/editor module pairs?
- Which systems are data, scripting, modules, or combinations of them?
- Which online systems justify first-party operational responsibility?
- What compatibility promise is feasible for WebGPU and fallback paths?
