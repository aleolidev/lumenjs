# LumenJS central development TODO

Status: authoritative long-range product program, adopted 2026-07-12.

This document is the single ordered backlog from the current experimental
candidate to a platform on which creators can finish, ship, maintain, and
extend complete original creature-RPGs. It converts the research corpus into
delivery work. `docs/product-specification.md` remains the historical rationale
for Phases 1–5; this document governs what comes next.

The target is not source compatibility with RPG Maker or Pokémon Essentials.
The target is comparable or better practical capability: an approachable
creator workflow, a deep data-driven creature-RPG preset, deterministic and
testable simulation, modern presentation, safe project evolution, and enough
evidence from complete independent games to support the resulting contracts.

Protected brands, characters, data, assets, maps, text, and other content never
enter LumenJS. Reference implementations are behavioral and design evidence,
not blanket permission to copy code. Every adaptation must obey its source
license and retain provenance.

## How to use this TODO

- Work top to bottom unless a recorded dependency or blocker justifies another
  order. Finish the currently active specification before selecting new work.
- A checkbox means repository evidence exists, not that code merely exists.
- Each major goal begins with a narrow technical specification and original
  adversarial fixtures, and ends with a requirement-by-requirement audit and
  retrospective.
- A capability is not complete until creators can author, validate, playtest,
  debug, migrate, document, and test it. Runtime-only support is incomplete.
- New public contracts require either two genuinely different consuming games
  or a concrete isolation/security need. Internal preset code may mature before
  it becomes public API.
- Keep one package and explicit unidirectional dependencies until measured
  evidence demonstrates that this is untenable.
- Owner, service, legal, publication, physical-device, and assistive-technology
  gates remain explicit. Never convert missing external evidence into a claim.
- Future handoffs must point to this file, identify the active goal and first
  unchecked acceptance item, and resume that work before selecting another.

## Definition of the destination

LumenJS is ready for complete-game development only when all mandatory outcomes
below are demonstrated by original projects:

- [ ] A newcomer can create, edit, playtest, debug, build, and update a small
  creature-RPG without changing engine internals.
- [ ] A team can build a 10+ hour campaign with multiple regions, hundreds of
  maps/events, a substantial original bestiary, branching quests, postgame,
  localization, and save upgrades without corrupting projects or saves.
- [ ] The official creature-RPG preset covers the expected campaign loop:
  exploration, narrative events, collection, party/storage, battles,
  progression, inventory/economy, encounters, trainers, quests, presentation,
  saves, accessibility, and debugging.
- [ ] Projects can deliberately replace or extend validated preset systems
  through documented, versioned module contracts without mutable globals.
- [ ] Deterministic replays, state hashes, structured explanations, focused
  tests, migration fixtures, performance budgets, and crash diagnostics make
  complex projects maintainable.
- [ ] At least three independent games prove the product: a traditional
  campaign, a mechanically divergent campaign, and a long-form production
  game owned outside the core fixture assumptions.
- [ ] Clean consumers can install a supported release, build offline-capable
  static output, verify provenance, and upgrade through the declared support
  window.
- [ ] Supported browsers, GPUs, input devices, audio behavior, accessibility
  combinations, and performance tiers are backed by recorded real-device
  evidence rather than emulation alone.

## Current baseline and active work

Phases 1–4 are complete as scoped experimental evidence. Phase 5 internal
hardening increments are complete, while publication, support, device, PWA,
authenticity, and service claims remain gated by
`docs/phase-5-owner-decision-checklist.md`.

The minimum TypeScript core has two-game evidence. The working tree contains
the subsequent dialogue and encounter increments and their completed audits;
they must become a coherent versioned baseline before Goal 6 begins.

- [x] Implement and audit the minimum dialogue core against Willowbound and
  Tideglass Reach.
- [x] Implement and audit the minimum encounter core against Willowbound and
  Tideglass Reach.
- [x] Review and integrate the current working tree as one intentional baseline,
  preserving the dialogue and encounter specifications, audits, and generated
  creator/export behavior.
- [x] Confirm the recorded clean consumer, Node, browser, headed-WebGPU,
  package, export, provenance, vulnerability, GitHub CI, and hosting gates for
  that exact versioned baseline.
- [x] Record whether these boundaries remain experimental preset facilities or
  satisfy the evidence threshold for public core contracts; do not infer npm
  publication from that decision.

---

## Goal 6 — executable parity map and standard-preset architecture

Outcome: turn every relevant research capability into owned work and establish
the dependency direction for the official `creature-rpg` preset without
prematurely publishing its internals.

Research sources: Pokémon Essentials and RPG Maker for creator behavior;
pokeemerald-expansion for mechanic breadth; Pokémon Showdown and pkmn/engine for
battle determinism; Tiled/LDtk for map workflows; Yarn Spinner and ink for
narrative; the scored assignments under `docs/research/` for all other areas.

- [x] Create a traceability matrix with one row per capability in
  `docs/research/capabilities.md`: reference, intended Lumen role, dependency,
  authoring surface, runtime owner, validation, debugger, fixtures, status, and
  explicit defer/reject reason.
- [x] Define the private dependency graph: core primitives -> platform adapters
  -> creature-RPG runtime systems -> presentation -> creator tooling.
- [x] Define stable identity, references, namespaces, versioning, compilation,
  cache invalidation, diagnostic locations, and extension-data policy across
  all project-owned sources.
- [x] Specify the event/effect boundary shared by world, quests, battles, items,
  abilities, cutscenes, and project extensions without creating one untyped
  universal scripting language.
- [x] Decide which sources remain human-editable, which are compiled caches,
  and how exact round trips and source-linked errors are preserved.
- [x] Define the standard preset's conservative defaults and escape hatches.
- [x] Add architecture fitness tests that reject forbidden dependency cycles,
  filesystem/DOM leakage into simulation, mutable globals, and nondeterministic
  time/randomness.
- [x] Write the Goal 6 audit and publish the ordered traceability matrix as the
  index for Goals 7–20.

Exit gate: every mandatory destination capability is owned by exactly one
future goal, has an authoring/runtime/testing route, and has no unexplained gap.

## Goal 7 — general event, dialogue, cutscene, and quest system

Outcome: creators can express the reactive campaign structures that currently
make RPG Maker/Essentials productive, with substantially better validation and
debugging.

- [ ] Specify typed conditions, commands, values, references, scopes, flags,
  variables, switches, reusable events, parallel/autorun behavior, waits,
  cancellation, and deterministic scheduling.
- [ ] Support dialogue branching, choices, portraits, expression cues, text
  effects, message substitution, and localization keys.
- [ ] Support cutscene choreography for actors, camera, fades, transitions,
  animation, sound cues, timing, skip/fast-forward, and safe interruption.
- [ ] Support quests, objectives, prerequisites, optional/hidden stages,
  journals, markers, rewards, failure, branching outcomes, and dependency
  tracing.
- [ ] Support world mutations, temporary parties, partner actors, scheduled
  events, and battle entry/result integration.
- [ ] Provide schema-driven forms plus a readable raw representation, search,
  reference navigation, reusable command templates, and undo/redo.
- [ ] Provide breakpoints, stepping, pause/resume, active-stack inspection,
  variable editing, dependency inspection, teleportation, and deterministic
  event replay.
- [ ] Detect unreachable branches, missing references, cycles, invalid scopes,
  impossible objectives, localization gaps, and unsafe infinite execution.
- [ ] Validate with a branching multi-chapter fixture and a second game using a
  structurally different quest model.

Exit gate: a creator can author and debug a multi-map branching chapter without
engine edits, and replay reaches identical state/fact hashes.

## Goal 8 — complete creature database and collection lifecycle

Outcome: original projects can define and maintain a substantial bestiary and
the complete ownership lifecycle expected of a creature-collection RPG.

- [ ] Define types, species, forms, variants, stats, growth curves, abilities,
  learnsets, evolutions, breeding/inheritance policy, habitats, rarity, lore,
  assets, cries, animation sets, and project-defined extension fields.
- [ ] Implement generated and contextual forms through deterministic providers
  without pre-materializing unbounded data.
- [ ] Implement capture, ownership metadata, party management, storage boxes,
  release, transfer, discovery, encyclopedia state, and duplicate handling.
- [ ] Implement experience, levels, caps, stat calculation, move learning,
  evolution decisions, training/respec, and configurable grind reduction.
- [ ] Build database authoring, bulk edit/import/export, cross-reference search,
  evolution graph inspection, asset preview, and balance reports.
- [ ] Validate illegal graphs, impossible learnsets, identifier changes,
  missing assets, incompatible forms, overflow, and migration behavior.
- [ ] Stress-test at 1,000+ original generated fixture species/forms and large
  save collections without borrowing protected data.

Exit gate: two games with distinct progression/form models share the same
contracts, and large bestiary editing and runtime lookup meet recorded budgets.

## Goal 9 — production-grade deterministic battle platform

Outcome: match the practical depth expected from mature creature-RPG engines
while providing stronger replay, explanation, testing, and extensibility.

- [ ] Specify turn phases, legal actions, priority/speed ordering, targeting,
  switching, capture, escape, defeat, draw, replacement, and battle lifecycle.
- [ ] Support singles, doubles, multi-actor, consecutive, horde, asymmetric,
  boss, scripted, and facility battles through composed rules rather than
  duplicated engines.
- [ ] Implement damage, types, moves, abilities, items, volatile/persistent
  statuses, weather, terrain, fields, team effects, transformations, temporary
  forms, and project mechanics through typed effect contracts.
- [ ] Implement trainer teams, generation/scaling policies, clauses, rulesets,
  battle facilities, rematches, and rewards.
- [ ] Implement deterministic named RNG streams, canonical logs, replays,
  state hashes, structured explanations, time travel, and divergence reports.
- [ ] Implement AI legal-action generation, configurable profiles, tactical
  evaluation, deterministic search budgets, explainable choices, and fixtures
  for weak through boss-grade opponents.
- [ ] Build battle-test authoring, state setup, turn stepping, effect tracing,
  legality inspection, batch simulation, matchup reports, and balance analysis.
- [ ] Build an original conformance corpus covering interactions, ordering,
  cancellation, recursion, replacement, fainting, and adversarial edge cases.
- [ ] Use Showdown/pkmn/pokeemerald-expansion only as licensed behavioral
  oracles where applicable; document every intentional semantic difference.
- [ ] Meet deterministic throughput and browser frame-budget targets at scale.

Exit gate: both campaign fixtures can express all required battle designs
without engine forks, and the conformance/replay corpus catches seeded semantic
regressions with actionable explanations.

## Goal 10 — world, exploration, encounter, and navigation platform

Outcome: creators can build large connected 2D/2.5D worlds rather than isolated
demo maps.

- [ ] Support regions, map graphs, interiors, layers, elevation, bridges,
  stairs, slopes, ledges, terrain semantics, collision, occlusion, navigation,
  transitions, streaming, and stable spawn/return positions.
- [ ] Support walking, running, jumping, swimming, diving, climbing, riding,
  followers, companions, field abilities, and fast travel as authored movement
  capabilities.
- [ ] Support random, visible, conditional, scripted, chained, and generated
  encounters with repel/lure equivalents, rarity, ecology, and context.
- [ ] Support interactables, hidden objects, push/strength-style puzzles,
  switches, moving platforms, secrets, and reset rules.
- [ ] Support day/night, calendars, weather, seasons, schedules,
  environmental effects, and deterministic time controls.
- [ ] Add world graph, collision, elevation, encounter, navigation, streaming,
  reachability, and soft-lock diagnostics.
- [ ] Preserve external Tiled interoperability while adding Lumen-owned world
  connection and semantic authoring; build an integrated map editor only if
  measured workflows prove it necessary.
- [ ] Stress-test hundreds of maps and transitions, large tilesets, streaming,
  save/reload at every boundary, and low-memory capability tiers.

Exit gate: the long-form fixture supports a multi-region world with no manual
engine wiring and meets traversal, streaming, and diagnostic budgets.

## Goal 11 — progression, inventory, economy, and campaign rules

Outcome: complete campaigns can express their reward loops and difficulty
without embedding rules in event scripts.

- [ ] Implement typed items, key items, equipment, stacks, metadata, inventory
  pockets, capacity rules, use contexts, targeting, and effect explanations.
- [ ] Implement currencies, shops, stock, pricing policies, buy/sell rules,
  crafting, loot tables, pickups, rewards, and item discovery.
- [ ] Implement milestones, access abilities, reputation, achievements,
  unlocks, regional completion, rematches, postgame, and New Game+ state.
- [ ] Implement level/scaling policies, difficulty presets, independent battle,
  puzzle, economy, accessibility, and grind settings.
- [ ] Implement composable challenge overlays: nuzlocke-like rules, randomizer,
  ironman, monotype, solo, level caps, and project-defined constraints.
- [ ] Build economy simulation, reward tracing, progression graph, item-use
  testing, randomizer validation, and soft-lock analysis.
- [ ] Validate traditional linear and open-world milestone-based fixtures.

Exit gate: two contrasting campaign structures use data/rules rather than
forked runtime code and remain completable under supported configurations.

## Goal 12 — saves, migrations, recovery, and campaign continuity

Outcome: long games remain trustworthy across crashes, upgrades, content
changes, devices, and creator mistakes.

- [ ] Define transactional save boundaries, slots, autosave/checkpoints,
  generation IDs, project/module versions, content fingerprints, and quotas.
- [ ] Preserve portable export/import, project ownership checks, atomic writes,
  corruption detection, backups, rollback, and clean recovery.
- [ ] Add forward migrations with dry-run reports, fixture snapshots, downgrade
  policy, missing-content behavior, and recovery from interrupted migration.
- [ ] Add save inspection, state editing with explicit taint/audit records,
  repair tools, diffing, anonymized diagnostics, and creator test saves.
- [ ] Add deterministic suspend/resume for battles, cutscenes, timed systems,
  generated runs, and map streaming boundaries.
- [ ] Test multi-year simulated version histories, schema/module removal,
  identifier refactors, full quota, denied storage, partial writes, and crashes.
- [ ] Keep cloud synchronization an external service until separately owned,
  specified, threat-modeled, and funded.

Exit gate: every released fixture save upgrades transactionally through the
supported history, and injected failures never silently lose the last good save.

## Goal 13 — presentation, audio, UI, input, and accessibility

Outcome: finished games can feel polished and remain usable across supported
web devices and access needs.

- [ ] Generalize the proven WebGPU renderer for cameras, tile/sprite batching,
  depth/interleaving, lighting, shadows, particles, water, reflections,
  post-processing, battle scenes, animation timelines, and capability tiers.
- [ ] Add atlases, asset streaming, texture compression where measured, device
  loss recovery, memory budgets, frame profiling, and visual regression.
- [ ] Add responsive DOM/canvas UI primitives for menus, party, storage,
  encyclopedia, inventory, shops, quests, dialogue, settings, and battle HUD.
- [ ] Add keyboard, pointer, touch, and gamepad adapters; remapping, prompts,
  focus, safe areas, orientation, vibration policy, and disconnect recovery.
- [ ] Add Web Audio music, ambience, effects, mixing, buses, fades, looping,
  spatial cues, autoplay recovery, interruption, routing, and volume settings.
- [ ] Add text size/speed, contrast, color alternatives, motion/flashing
  controls, captions, audio alternatives, hold/toggle choices, assists, and
  semantic navigation where applicable.
- [ ] Establish real-device browser/GPU/input/audio/AT tiers and record sessions
  before claiming support.
- [ ] Provide theme tokens and project-owned presentation overrides without
  coupling simulation to rendering or UI.

Exit gate: all three proof games meet recorded performance and accessibility
budgets on declared tiers, with graceful explicit behavior outside them.

## Goal 14 — complete creator workbench

Outcome: everyday development no longer depends on editing scattered JSON or
understanding engine internals, while raw sources remain readable and Git
friendly.

- [ ] Provide a coherent project dashboard, guided creation, templates,
  examples, contextual documentation, recent work, and health summary.
- [ ] Provide schema-driven databases for creatures, types, moves, abilities,
  items, trainers, encounters, evolutions, quests, progression, economy, and
  rulesets with raw-data escape hatches.
- [ ] Integrate event/dialogue/cutscene/quest, world-connection, battle-test,
  animation/effect, localization, and asset workflows from their owning goals.
- [ ] Provide global search, dependency graph, go-to-reference, bulk operations,
  safe rename/delete, previews, diffs, history, undo/redo, backups, and recovery.
- [ ] Provide focused playtest from map/event/battle/quest/save, hot reload where
  safe, deterministic reset, teleport, state edit, inspectors, overlays, logs,
  traces, screenshots, and shareable diagnostic bundles.
- [ ] Provide asset import/conversion, provenance/license records, duplicate and
  missing-use reports, atlas/compression previews, and build-size budgets.
- [ ] Provide localization extraction, plural/select validation, font/glyph
  coverage, layout preview, pseudo-locales, and translation handoff files.
- [ ] Run observed newcomer and experienced-creator trials on complete chapters;
  measure time, errors, recovery, documentation use, and engine-file edits.

Exit gate: representative creators build a polished chapter from scratch,
diagnose seeded failures, and upgrade it without core-team intervention.

## Goal 15 — modules, project scripting, and compatibility

Outcome: advanced games can extend or replace systems deliberately without
turning LumenJS into a mutable-global plugin environment.

- [ ] Version the public SDK and individual capability contracts only after
  their multi-game evidence gates pass.
- [ ] Define module manifests, dependencies, capabilities, configuration,
  project data, lifecycle, compatibility ranges, conflicts, ordering, and
  migrations.
- [ ] Provide injected object capabilities for trusted ESM modules and prevent
  implicit DOM, filesystem, storage, network, clock, RNG, renderer, or save
  authority from entering deterministic systems.
- [ ] Define typed project scripting for concrete cases that data/effects cannot
  express; include source maps, diagnostics, deterministic APIs, test harnesses,
  and upgrade rules.
- [ ] Prove replacement boundaries with real alternatives: at minimum one
  battle ruleset, one progression policy, one encounter policy, and one
  presentation module.
- [ ] Add compatibility planning, dry-run upgrades, missing-module reports,
  dependency visualization, lock records, deprecation windows, and fixtures.
- [ ] Keep untrusted runtime/editor plugins out of v1 unless isolation,
  permission UX, review, update, and incident ownership are fully specified.

Exit gate: a third-party-shaped module can be built from public documentation,
installed, tested, upgraded, removed, and diagnosed without private imports.

## Goal 16 — advanced campaign structures and side-system proof

Outcome: demonstrate that the platform exceeds a single traditional template
and can support the ambitious structures found across the research corpus.

- [ ] Build an open-world progression module with authored milestones,
  scalable encounters/trainers, sequence-break handling, and completion checks.
- [ ] Build a roguelite run module with seeds, generation, run/meta separation,
  suspend/resume, daily-shaped offline fixtures, and deterministic replay.
- [ ] Build contextual battlefields/boss mechanics and composable difficulty or
  challenge overlays without forking the battle kernel.
- [ ] Build an original compositional/generated-creature provider with lazy
  data/assets and explicit provenance.
- [ ] Build at least two side-system examples—such as housing/decoration,
  crafting/farming, contests, fishing/mining, photography, or races—using public
  extension contracts.
- [ ] Record which abstractions survived and remove those justified only by one
  showcase.

Exit gate: divergent structures compose with saves, tools, presentation, and
upgrades, demonstrating capabilities beyond a conventional Essentials workflow.

## Goal 17 — production scale, collaboration, and quality engineering

Outcome: LumenJS remains understandable and reliable at real game scale.

- [ ] Establish scale fixtures for maps, events, localized messages, assets,
  bestiary, trainers, encounters, saves, modules, and build output.
- [ ] Set cold start, focused playtest, validation, incremental rebuild, memory,
  frame, save, migration, and export budgets per supported capability tier.
- [ ] Add incremental compilation/caching with exact dependency invalidation and
  reproducible clean-build equivalence.
- [ ] Add property, fuzz, mutation where valuable, deterministic integration,
  visual, migration, compatibility, and long-soak tests.
- [ ] Add structured logs, traces, crash boundaries, diagnostic bundles, privacy
  controls, and actionable failure identifiers.
- [ ] Prove merge-friendly sources, stable ordering, conflict diagnostics,
  multi-author Git workflows, CI annotations, and reviewable generated changes.
- [ ] Run supply-chain, dependency, license, provenance, secret, and artifact
  audits on every release candidate.

Exit gate: the production fixture stays within budgets and two creators can
merge concurrent content work and recover from seeded failures predictably.

## Goal 18 — three complete proof games

Outcome: replace architecture-by-demo with product evidence from finished games.

- [ ] Finish Game A: a polished traditional 8–10 hour original campaign with a
  substantial bestiary, gyms/major challenges, branching quests, postgame,
  localization, accessibility settings, and upgrade history.
- [ ] Finish Game B: a 3–5 hour mechanically divergent original campaign using
  open-world, roguelite, compositional-creature, challenge, or substantial
  side-system capabilities.
- [ ] Finish Game C: an independently maintained production game whose team is
  not allowed private engine knowledge or fixture-only shortcuts.
- [ ] Conduct creator usability, player completion, save-upgrade, performance,
  accessibility, deployment, and maintenance studies for all three.
- [ ] Remove or redesign APIs that require core-team intervention, cannot be
  explained, or fail across the three projects.
- [ ] Publish honest case studies, limitations, provenance, and compatibility
  records without using protected franchise content.

Exit gate: all three games ship complete builds through supported workflows and
continue working across at least one real platform upgrade cycle.

## Goal 19 — supported release and long-lived project contract

Outcome: move from an experimental candidate to a supportable public platform.

- [ ] Resolve every applicable item in
  `docs/phase-5-owner-decision-checklist.md` with recorded evidence.
- [ ] Define semantic versioning scope, supported versions, deprecation policy,
  migration guarantees, security policy, release cadence, maintenance capacity,
  governance, contribution process, and incident response.
- [ ] Publish through approved npm Trusted Publishing with provenance, clean
  consumer verification, rollback/deprecation plan, signed/tagged source, and
  reproducible artifact checks.
- [ ] Support static hosting and offline/PWA behavior only after update
  atomicity, cache invalidation, install metadata, icons, rollback, recovery,
  browser, and real-device tests pass.
- [ ] Publish complete creator, player-facing integration, module, migration,
  troubleshooting, accessibility, performance, and deployment documentation.
- [ ] Run release-candidate adoption with external creators and fix all blockers
  before removing the experimental label.

Exit gate: a clean external team can adopt, ship, upgrade, and obtain support
under an explicit sustainable contract.

## Goal 20 — optional operated services, only with an owner

Outcome: online features never compromise the offline engine or create an
unfunded promise.

- [ ] Preserve complete offline campaigns and portable ownership as the default.
- [ ] For each proposed service—cloud saves, trading, PvP, gifts, leaderboards,
  shared seeds, visiting/co-op—name the sustainable operator and specify value,
  privacy, moderation, abuse, security, protocol versioning, cost, monitoring,
  outage behavior, data export/deletion, and shutdown.
- [ ] Define authoritative validation, synchronization, replay, anti-cheat, and
  compatibility boundaries without placing service logic in the core.
- [ ] Threat-model and independently review each service before handling user
  identity or data.
- [ ] Ship no service until its lifecycle and exit plan are funded and tested.

Exit gate: each shipped service can fail or close without making offline games
unplayable or trapping creator/player data.

---

## Permanent release checklist

Every major goal and release candidate must answer all of these:

- [ ] Which research capability and reference behavior does this satisfy?
- [ ] Can a creator author it without editing engine internals?
- [ ] Are schemas, semantic references, diagnostics, and documentation complete?
- [ ] Can it be focused-playtested, inspected, replayed, and regression-tested?
- [ ] Are time, randomness, input, I/O, rendering, audio, and persistence
  explicit at their boundaries?
- [ ] Are migrations, removal, invalid data, missing assets/modules, and partial
  failure tested?
- [ ] Do at least two different games justify every proposed public contract?
- [ ] Are performance, accessibility, browser/device, security, licensing, and
  provenance claims backed by the required kind of evidence?
- [ ] Does the change leave the package and dependency direction easier to
  understand?
- [ ] Does the completion audit distinguish proven, emulated, externally gated,
  deferred, rejected, and experimental outcomes?

## Explicit non-goals and claim discipline

- Do not promise compatibility with RPG Maker, Pokémon Essentials, their data,
  plugins, scripts, or projects unless a separately specified clean-room
  importer earns that claim.
- Do not distribute protected franchise content or market LumenJS as an
  official franchise product.
- Do not adopt an evaluated engine wholesale merely to accelerate a checklist.
- Do not make every preset facility part of the small public core.
- Do not add online accounts or services as prerequisites for local creation,
  play, saves, builds, or project ownership.
- Do not call the destination reached because a showcase can execute a feature;
  the authoring, diagnostic, testing, migration, documentation, scale, and
  multi-game evidence are part of the feature.
