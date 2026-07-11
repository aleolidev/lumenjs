# Phase 2 campaign-slice retrospective

Date: 2026-07-11.

## Outcome

The campaign slice proves a small recognizable creature-RPG loop on top of
First Light. Validated creator data now drives dialogue, a companion choice, an
authored encounter, a deterministic one-versus-one battle, item use, victory,
loss, recruitment, return dialogue, and complete campaign replays.

The implementation remains deliberately fixture-specific. It does not make
dialogue nodes, battle state, creature records, CSS creature marks, or campaign
coordination public APIs.

## Boundaries to keep

- Structural validation followed by semantic reference resolution catches
  broken dialogue, creature, move, starter, and encounter IDs before runtime.
- Typed actions keep world, dialogue, and battle changes out of UI code.
- Integer rules and data-derived speed make battle outcomes easy to explain.
- Structured facts let the UI describe damage, healing, defeat, recruitment,
  and results without recalculating rules.
- One campaign state and hash cover transitions across world, dialogue, battle,
  and result modes.
- Browser-independent simulation makes victory and loss replays cheap to test.

## Boundaries to revisit

- Campaign state currently contains the Phase 1 world state. A second map and a
  save format should test whether composition remains sufficient.
- Dialogue effects are a closed fixture list. A second story fixture should
  precede any reusable command or event vocabulary.
- Battle presentation is HTML/CSS while the world is WebGPU. Animation and
  accessibility work should define how presentation consumes facts over time.
- Move effects only deal fixed damage. Status, targeting, switching, and
  progression need real campaign requirements before changing the rule shape.
- The app coordinates modes directly. A longer campaign should test whether
  this remains understandable before introducing a navigation abstraction.

## Boundaries to avoid

- Do not turn the current battle functions into a generic battle framework.
- Do not promote the CSS creature marks into an asset pipeline.
- Do not infer a universal capture formula from one authored recruitment.
- Do not add an ECS, scripting language, module system, or package split from
  this single campaign slice.

## Next product decision

The next increment should test campaign continuity: a second map, a versioned
local save with portable export/import, and a longer party-aware dialogue. It
should keep the existing deterministic replay as a migration and regression
oracle. Audio and richer battle rules can follow when that continuity is safe.
