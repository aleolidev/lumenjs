# Minimum dialogue core specification

Status: implemented baseline, later extended by
`minimum-encounter-core-specification.md` from new two-game evidence.

## Evidence and product slice

Willowbound and Tideglass Reach each declare a localized two-node dialogue in
their creator campaign. Each opening node offers two original companions and
advances to a closing node. The current TypeScript core can only repeat the
character's single `messageKey`, so neither game can play its already validated
choice.

The next shared increment must let an application:

1. interact with a character that explicitly names a dialogue start node;
2. receive the localized speaker, message, and available choices;
3. select a choice by stable ID;
4. apply the existing `choose-companion` or `close-dialogue` effects;
5. advance or close the dialogue deterministically; and
6. save and restore the resulting dialogue and party state safely.

This evidence does not justify battles, encounters, trainers, quests, inventory,
conditions, scripting, commands, or a general event graph.

## Authored boundary

- A world character gains a required `dialogue` node ID. This is an explicit
  reference; matching a character and dialogue by message text or array order is
  forbidden.
- The creator validator proves that every character dialogue reference exists.
- The core consumes the campaign's existing dialogue nodes and only the creature
  identity needed by `choose-companion`.
- Locale catalogs remain the source of dialogue messages and choice labels.

## Public runtime boundary

- `GameAction` gains `{ type: "choose"; choiceId: string }`.
- `GameState` gains `dialogue` and `party`.
- An open dialogue snapshot exposes stable IDs and render-ready localized text;
  applications do not traverse source documents to render it.
- `GameFact` gains facts for opening dialogue, selecting a choice, choosing a
  companion, advancing dialogue, and closing dialogue.
- Movement, interaction, and waiting are rejected while a dialogue is open.
  Choosing is rejected while no dialogue is open.
- Existing state and save format strings advance to `v2-experimental`. The
  unpublished experimental `v1` shape is not silently widened.

No new method is added to `Game`. The existing `dispatch`, `getState`, save, and
restore boundary is sufficient.

## Determinism and isolation

1. The same project, focus, and action sequence produces the same snapshots and
   ordered facts.
2. Returned state, facts, maps, dialogue choices, and saves are isolated copies.
3. A choice is resolved by own-property authored identity, never inherited
   object state.
4. An invalid action or choice throws before replacing live state.
5. Choosing a companion produces a one-member party containing the authored
   creature ID. A later authored companion choice may replace that selection.
6. `close-dialogue` closes immediately and cannot advance.
7. A choice with `next` advances after applying its effect; a choice without
   `next` closes.

## Save validation

A restored save must prove all existing project, locale, map, position, message,
and exact-field invariants plus:

1. `party` is empty or contains exactly one authored creature;
2. an open dialogue names an authored character, node, message, speaker, and
   exact localized choice inventory;
3. the open node is reachable from that character's declared start node;
4. party state is reachable along a path to the open node under the supported
   choice effects; and
5. a malformed dialogue or party snapshot is rejected without mutating the
   session.

## Acceptance evidence

1. Willowbound opens Oren's dialogue, chooses Bramblefin, advances, closes, and
   restores that party through a save.
2. Tideglass Reach independently opens Sela's dialogue, chooses Gustling,
   advances, closes, and restores that party through a save.
3. Both games expose their own Spanish messages and labels.
4. Node tests cover invalid modes, unknown choices, isolation, malformed saves,
   unreachable dialogue state, and forged localized content.
5. Generated static exports render and operate the same compiled core dialogue
   in the portable browser matrix.
6. Strict TypeScript declarations compile in a clean installed consumer.
7. Existing CLI, First Light, portable CI, headed WebGPU, package allowlist, and
   reproducible tarball gates remain green.
8. npm remains unpublished and no compatibility claim is added.
