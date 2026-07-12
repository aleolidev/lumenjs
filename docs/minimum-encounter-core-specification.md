# Minimum encounter core specification

Status: implemented and proven by `minimum-encounter-core-completion-audit.md`.

## Evidence and product slice

Willowbound and Tideglass Reach independently declare:

- two selectable companions and one opposing creature;
- fixed health and speed statistics;
- fixed-power moves with authored use counts; and
- one encounter with a distinct project-owned identity.

Their current core flow stops after entering the second map. The next increment
must let each game place its encounter explicitly in that map, resolve a small
deterministic one-against-one battle, save it safely, and continue after a
result.

This evidence does not justify capture, recruitment, experience, levels,
inventory, trainers, quests, status effects, randomness, configurable AI,
multi-creature teams, animation, or a general event language.

## Authored boundary

1. A creator world gains an `encounters` array.
2. Each world encounter declares a stable trigger ID, a Tiled object of type
   `encounter`, and a campaign encounter ID.
3. Trigger IDs are unique within a world and trigger cells cannot overlap
   characters, transitions, other encounters, spawns, collisions, or map bounds.
4. Campaign encounters continue to name one creature.
5. Every creature names one or more declared moves. Existing creator validation
   remains the authority for those references.
6. Safe encounter renames update world trigger references as well as trainer and
   quest references.

Willowbound places `workshop-prismole` in Starglass Workshop. Tideglass Reach
places `tower-beacon-mite` in Signal Tower. The trigger geometry is original
project data.

## Public runtime boundary

- `GameAction` gains `{ type: "use-move"; moveId: string }` and
  `{ type: "finish-battle" }`.
- `GameState` gains `battle` and `completedEncounters`.
- State and save format strings advance to `v3-experimental`; v2 is not silently
  widened.
- `GameMap` exposes render-facing encounter trigger cells.
- `GameFact` gains facts for companion requirements, encounter start, move use,
  damage, exhausted enemy moves, victory, defeat, completion, and defeat reset.
- Existing `Game` methods remain unchanged.

Entering an incomplete encounter trigger with no selected companion rejects the
movement without changing position and emits a companion-required fact. Entering
with one selected companion moves onto the cell and opens a battle.

## Deterministic turn rules

1. The application selects one authored ally move by stable ID.
2. Higher speed acts first. The ally acts first on a tie.
3. An attack consumes one remaining use and deals exactly its authored power.
4. Health is clamped at zero.
5. A defeated participant does not act later in that turn.
6. The opponent always selects its first move with remaining uses.
7. If the opponent has no remaining move, it skips its attack and emits an
   explanatory fact.
8. Zero enemy health produces victory. Zero ally health produces defeat.
9. No battle action is accepted after a result except `finish-battle`.
10. Finishing victory closes the battle and records the campaign encounter ID as
    completed. Its trigger becomes inert.
11. Finishing defeat closes the battle and returns the player to the active
    map's default spawn. The encounter remains available for retry.
12. World, dialogue, and battle actions are mutually exclusive modes.

## State and isolation

The battle snapshot contains:

- map, trigger, and campaign encounter identities;
- `active`, `victory`, or `defeat` outcome;
- ally and enemy creature identity, name, current/max health, and speed; and
- render-ready moves with ID, name, power, and remaining/max uses.

All returned snapshots and facts are isolated copies. Invalid modes, move IDs,
exhausted ally moves, and premature finish actions throw before live state is
replaced.

## Save validation

A restored save must prove all previous v2 invariants plus:

1. `completedEncounters` is a duplicate-free list of authored campaign
   encounters bound by this project;
2. dialogue and battle cannot both be open;
3. an open battle belongs to the active map and a trigger at the saved player
   position;
4. the ally is the selected party companion and the enemy is the encounter's
   authored creature;
5. names, statistics, move inventories, power, and maximum uses match authored
   data exactly;
6. current health, remaining uses, and outcome are reachable through the
   deterministic turn rules from a fresh encounter; and
7. an active battle cannot already be completed.

Malformed or unreachable battle state is rejected without mutating the session.

## Web export boundary

Generated exports render an accessible battle section with participant names,
health, outcome, one button per ally move, and a finish button after a result.
World controls, dialogue controls, and battle controls are enabled only in their
own mode. Keyboard and touch activate the same core actions through buttons; no
battle rule is duplicated in the UI.

## Acceptance evidence

1. Willowbound chooses Bramblefin, enters Starglass Workshop, defeats Prismole,
   finishes, and crosses the now-inert trigger without retriggering.
2. Tideglass Reach chooses Gustling, enters Signal Tower, defeats Beacon Mite,
   finishes, and preserves completion through save/restore.
3. A slower/insufficient test fixture proves defeat and default-spawn retry.
4. Node tests cover exact ordered facts, repeated determinism, invalid modes,
   exhausted moves, isolation, forged completion, and unreachable battle saves.
5. Creator tests cover trigger schema, geometry, semantic references, and safe
   rename behavior.
6. Static exports exercise both distinct encounters in Chromium, Firefox, and
   WebKit at desktop and narrow touch viewports.
7. Strict declarations compile in a clean installed consumer.
8. Full CI, Cloudflare build, headed real WebGPU, package allowlist, and
   reproducible tarball gates remain green.
9. npm remains unpublished and no compatibility promise is added.
