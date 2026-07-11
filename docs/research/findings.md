# Initial findings

These findings synthesize the first functional research pass. They remain
hypotheses until source-level study and prototypes validate them.

## Product conclusions

### Authoring is part of the feature

A capability is not fully supported merely because runtime code can execute it.
An official capability needs an authoring path, schema, validation, focused
preview, debugging, migrations, tests, documentation, and an example.

### Complexity should be available, not mandatory

Large fangames combine systems that small projects do not need. LumenJS should
offer coherent presets for beginners while advanced projects add or replace
capabilities deliberately.

### Rules need composition and explanation

Fields, abilities, items, statuses, difficulty modifiers, challenge modes, and
boss mechanics repeatedly interact with the same lifecycle. They need explicit
scope, ordering, provenance, conflict handling, and an inspector that explains
why an outcome occurred.

### Content is not always a static row

Variants, contextual forms, and fusions show that content may be inherited,
derived, generated, or supplied lazily. Logical identity, presentation assets,
provenance, caching, and fallback must be separable.

### Campaign state needs first-class structure

Opaque numeric switches do not scale to long, branching projects. Stable IDs,
typed state, quest graphs, reference navigation, causal inspection, and save
migrations are required.

### Determinism unlocks tooling

Seeded RNG, a controllable clock, structured command logs, and explicit state
boundaries enable replays, battle fixtures, procedural generation, debugging,
multiplayer validation, and reproducible bug reports.

### Online capabilities are operated products

Trading, gifts, cloud storage, shared bases, and PvP require protocols,
moderation, privacy, monitoring, migrations, and long-term ownership. Games must
degrade safely when optional services disappear.

## Authoring platform lessons

### Pokémon Essentials

Essentials demonstrates the value of editable source data, compilation caches,
plugin metadata, debug handlers, data migration, and focused editors. Its
RPG Maker inheritance, split distribution, global state, monkey-patching, and
fragile plugin interactions make it a requirements source rather than a modern
architectural model.

Primary references:

- <https://github.com/Maruno17/pokemon-essentials>
- <https://github.com/Maruno17/pokemon-essentials/releases>

### PSDK and Pokémon Studio

Their separation of database editor, runtime, and map tooling is a stronger
starting reference. However, creators still cross several applications and
version boundaries. The project's own v3 vision seeks clearer modular events,
less implicit engine logic, centralization in Studio, and removal of the paid
RPG Maker dependency.

Primary references:

- <https://docs.pokemonworkshop.com/>
- <https://github.com/PokemonWorkshop/PokemonStudio>
- <https://github.com/PokemonWorkshop/PokemonStudio/wiki/V3-Doc-Product-Vision>
- <https://gitlab.com/pokemonsdk/pokemonsdk>

### Tuxemon

Tuxemon is useful for original, data-driven content, Tiled maps, separate mods,
localization, tests, and a live debug CLI. It is not currently a convincing
beginner authoring experience, but it offers a cleaner provenance case and
valuable engineering patterns.

Primary reference: <https://github.com/Tuxemon/Tuxemon>

## ROM-hack lessons

### pokeemerald-expansion

It proves demand for broad configuration, modern mechanics, debug tooling,
tests, migration scripts, and a maintained reusable base. Hundreds of compile-
time flags and fork-and-merge updates also expose configuration explosion and
upgrade conflict risks.

Primary references:

- <https://github.com/rh-hideout/pokeemerald-expansion>
- <https://github.com/rh-hideout/pokeemerald-expansion/blob/master/FEATURES.md>
- <https://github.com/rh-hideout/pokeemerald-expansion/blob/master/INSTALL.md>

### Emerald Rogue

It demonstrates that a creature/battle foundation can support a different
genre through seeded runs, generated routes, a persistent hub, quests, and
metaprogression. It motivates explicit RNG and separate run, campaign, and meta
state.

Primary reference:
<https://github.com/Pokabbie/pokeemerald-rogue/tree/expansion-dev>

### Crystal Clear and Prism

Crystal Clear demonstrates milestone-based open progression and scaled gyms.
Prism demonstrates broad side systems and disciplined attention to save/build
compatibility. Both warn against assuming one fixed campaign sequence.

Primary references:

- <https://github.com/ShockSlayer/ccdocs/blob/master/docs/Documentation.md>
- <https://rainbowdevs.com/>
- <https://www.pokemonprism.com/logs.html>

## Fangame lessons

- **Reborn:** battlefields can be strategic rule systems, not presentation.
- **Rejuvenation:** effects require explicit scopes and quests can span large
  portions of a campaign.
- **Insurgence:** variants, modes, bases, personalization, and services can
  coexist, but should not become engine special cases.
- **Uranium:** original bestiaries and online services broaden both content
  tooling and operational responsibilities.
- **Infinite Fusion:** derived content and community asset scale require lazy
  providers, manifests, hashes, provenance, and trustworthy distribution.
- **Phoenix Rising:** announced possibility is not demonstrated support; scope
  must distinguish shipped, experimental, and conceptual features.

Primary references:

- <https://www.rebornevo.com/pr/index.html/>
- <https://rejuvenation.wiki.gg/wiki/Crests>
- <https://p-insurgence.com/>
- <https://www.pokemonuranium.org/>
- <https://fusiondex.org/>
- <https://docs.phoenixthegame.com/>

## Antipatterns to avoid

- Monkey-patching or load order as the primary extension API.
- Global mutable switches and opaque numeric IDs.
- Special-case branches for every transformation, item, or boss mechanic.
- Source and compiled data that can diverge without a safe round trip.
- Updating a project by merging a framework template into it.
- Multiple mandatory authoring applications with overlapping ownership.
- Engine updates that overwrite creator customizations.
- Ad hoc save migrations without backup, preview, or rollback.
- Huge effect matrices without deterministic tests and explanation tooling.
- Online dependencies that make offline campaigns unplayable.
- Asset packs without hashes, provenance, licensing, or trusted origin.
- Documentation manually duplicated from game data.
- Claiming a capability before it can be authored, validated, debugged, tested,
  and migrated.

## Working direction for later validation

- A minimal core coordinates lifecycle, clock, RNG, resources, platform I/O,
  persistence transactions, diagnostics, and capability registration.
- Shared contracts cover stable IDs, content providers, effects, policies,
  state queries, serialization, migrations, UI/editor contributions, and remote
  services.
- Official modules provide the coherent creature-RPG experience.
- Optional modules provide alternative campaign structures and online systems.
- Presets hide dependency assembly from beginners.
- Canonical project data stays human-readable and versioned; compiled caches
  remain disposable.
- A project lockfile records engine and module compatibility.
- Upgrades provide dry-run reports, backups, migrations, and rollback.

No API or package boundary is settled by these findings.
