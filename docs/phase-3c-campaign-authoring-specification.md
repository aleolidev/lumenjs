# Phase 3C campaign-authoring specification

Status: authorized for implementation on 2026-07-12 from the clean-room fixture.

## Product question

Can the experimental creator model express and diagnose the remaining standard
preset relationships—trainers and quest-like goals—without introducing a
general event language?

## Trainer records

A trainer has a stable ID, authored name, a non-empty ordered creature party,
and one referenced encounter. Validation resolves every creature and encounter.
The record describes authoring meaning only; it does not settle trainer battle
runtime rules.

## Quest records

A quest has a stable ID, localized title and summary keys, one dialogue node
that starts it, and one encounter whose completion marks the authored goal.
This deliberately narrow start/completion pair tests references and localization
without inventing conditions, commands, rewards, or an event language.

## Acceptance criteria

1. The clean-room scaffold contains one original trainer and one original quest.
2. Schema and semantic validation cover trainer party/encounter and quest
   messages/dialogue/encounter with coded diagnostics.
3. Inspect reports deterministic trainer/quest counts and relationships.
4. Creature, dialogue, encounter, and message safe renames update the new
   references and retain rollback guarantees.
5. Static export includes the authored data without new generated state.
6. Node and inherited verification gates remain green.
7. Trainer/quest records remain experimental and are not runtime/public APIs.

## Deferred

Trainer AI, battle sequencing, rewards, quest logs, branching objectives,
conditions, scripting, visual authoring, focused runtime starts, and a general
event system remain deferred.
