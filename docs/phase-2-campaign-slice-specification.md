# Phase 2 campaign-slice specification

Status: implemented and locally validated on 2026-07-11.

## Product question

Phase 2 must answer one question: can LumenJS turn validated creator data into
the smallest recognizable creature-RPG story loop without weakening the clear,
deterministic boundaries proven by First Light?

The proof is one short continuation of Lantern Vale. The player speaks with
Mira, chooses one companion from a small original roster, enters one authored
encounter, completes one deterministic single battle, and returns to the world
with the result visible in dialogue and project state.

This remains a fixture-driven product experiment. It does not define a public
battle, dialogue, creature, event, or module API.

## Player loop

1. Speak with Mira after lighting the beacon.
2. Read a short dialogue and choose one of two original companions.
3. Walk to a clearly marked encounter location.
4. Enter a one-versus-one, turn-based battle.
5. Choose between two moves or one limited-use recovery item.
6. Win, lose, or recruit the encountered creature through explicit rules.
7. Return to Lantern Vale and receive dialogue that reflects the result.
8. Replay the complete world-and-battle action log to the same final state.

The fixture should take only a few minutes and should make every meaningful
state change visible to the player.

## Creator workflow

The creator continues to use Tiled for map geometry and Lumen-owned JSON files
for gameplay meaning. Phase 2 adds small, versioned sources for:

- dialogue nodes and choices;
- an original creature roster and move definitions;
- the starting companion choice, encounter, and battle setup; and
- the minimum party and inventory state used by the fixture.

Sources are validated structurally and then resolved semantically before any
runtime state is created. Diagnostics must identify the source path and stable
ID for missing dialogue targets, creatures, moves, encounters, or rewards.

No general event language, visual scripting system, or editor schema is implied.

## Runtime boundaries

Phase 1's direction remains: project loading produces validated definitions,
and synchronous simulations consume validated actions and emit structured
facts. Phase 2 adds domain-specific dialogue and battle simulation beside the
world simulation. The app coordinates transitions between them.

The battle simulation must not import browser, renderer, audio, or storage
code. Rendering consumes a battle view derived from state. Dialogue choices
produce validated actions rather than mutating world state from the UI.

Shared helpers are introduced only when two real consumers require identical
behavior. Existing First Light scene-item and renderer shapes remain internal.

## Determinism contract

The canonical campaign replay records ordered world, dialogue, and battle
actions. The same validated project version and replay must produce:

- the same final world, party, inventory, and battle state;
- the same ordered structured facts; and
- the same versioned state hash.

The fixture should avoid randomness. If a battle rule genuinely needs chance,
the project supplies a recorded deterministic value source and diagnostics
expose its consumption. Time, animation, and frame rate never decide outcomes.

## Battle rules for the fixture

- One active creature per side; no switching.
- A small original roster with only the statistics required by the fixture.
- Two authored moves per creature with explicit power and use limits.
- Fixed turn order derived from validated creature data.
- Integer-only damage rules with no hidden modifiers or random critical hits.
- One recovery item, used through the same validated-action path as moves.
- Explicit win and loss terminal states.
- One authored recruitment condition after victory; no reusable capture formula
  is selected from this single case.

Each turn emits facts explaining the chosen action, damage, remaining health,
item use, defeat, and final result. The UI may phrase those facts for players,
but it must not recompute the rules.

## Dialogue rules for the fixture

- Linear text and explicit choices are enough.
- Conditions may read named project state needed by this fixture.
- Effects are a closed, validated set: choose companion, start encounter, and
  record the final outcome.
- Missing targets and impossible choices fail during project loading.
- Dialogue state is serializable and included in replay/hash evidence.

This is not yet a general quest or scripting system.

## Presentation

Lantern Vale keeps the approved rectangular top-down 2.5D direction. Dialogue
uses a responsive HTML interface over the playtest. Battle may use a focused
2D composition with the same original pixel-art language; it does not need a
second 3D scene or a generic battle renderer.

Animation may make actions readable, but simulation resolves synchronously and
the UI can skip or accelerate presentation without changing results. Classic
and Enhanced modes must show the same battle state and choices.

## Required fixtures

- Two original starter companions with distinct but simple tactics.
- One original recruitable encounter creature.
- One short Mira dialogue with a companion choice and result branch.
- One canonical successful campaign replay.
- One canonical loss replay.
- Broken sources covering at least a missing dialogue target and missing move.
- Original creature names, prose, data, and art with recorded provenance.

## Acceptance criteria

Phase 2 is complete only when:

1. all new project sources are structurally and semantically validated before
   campaign state exists;
2. source-linked diagnostics explain broken cross-references;
3. the companion choice changes validated party state;
4. one complete battle supports moves, item use, win, loss, and the authored
   recruitment outcome;
5. battle facts explain every state change without UI rule duplication;
6. canonical world-dialogue-battle replays reproduce final hashes and facts;
7. returning to the world visibly reflects the battle result;
8. Classic and Enhanced presentation produce identical simulation state;
9. Node tests cover rules and replay without a browser;
10. Chromium, Firefox, and WebKit tests cover the player loop and responsive UI;
11. the real WebGPU lane proves world rendering remains valid and error-free;
12. all new content is original and provenance is recorded; and
13. a retrospective identifies which Phase 2 boundaries deserve another use
    case before they can become public.

## Explicitly deferred

Generational saves, import/export, audio, control remapping, touch/gamepad
parity, localization, status effects, type charts, experience, levels,
multi-creature parties, switching, equipment, procedural encounters, battle
AI frameworks, online play, quests, a general event language, and public module
contracts remain outside this slice.

These may return in later Phase 2 increments after the core campaign loop has
produced evidence. The specification should be revised before implementation
if any of them becomes necessary for the fixture.

## Implementation authorization gate

Implementation begins only after review of this scope. Approval authorizes the
smallest changes needed for the fixture, tests, diagnostics, and original
assets. It does not authorize a monorepo, public runtime API, general battle
framework, or settled `src` architecture.
