# Phase 4 extensibility trial results

Trial date: 2026-07-12.

## Context contributions

Tideglass Arena and Cinder Vow both need independently owned values to affect an
encounter without editing the encounter definition. One contributes terrain and
weather; the other contributes item and recovery policies. The disposable
resolver combines both without scenario-name branching, records field ownership
and source, preserves declared order, rejects duplicate owners and unsupported
versions, and produces a deterministic hash.

This passes the two-consumer and replacement-benefit gates: either contribution
can be independently absent or distributed, while nested conditionals would
couple unrelated needs.

## Open-world scaling

Longroad Wilds resolves deterministic encounter strength from authored region
bands and a milestone integer. A small data resolver covers the observed need.
There is no second scaling strategy or interchangeability benefit, so a scaling
module is rejected for now.

## Creature composition

Mosaic Kin benefits from explicit identity, body, marking, temperament, moves,
and per-slot provenance. The prototype catches missing or multiply owned slots,
but only one scenario consumes the boundary. Keep the ownership model as
research; do not create a production module or art pipeline.

## Failure/removal results

- Contribution owner collisions fail before resolved context.
- Unsupported versions identify the owning source and migration remedy.
- Removing battlefield or challenge contributions leaves the other readable.
- Changing declaration order changes the applied provenance sequence and hash,
  but not ownership where keys are disjoint.
- Missing scaling regions/bands and creature slots fail deterministically.

## Decision

Authorize Phase 4A for one internal experimental encounter-context contribution
boundary with two original consumers. Keep scaling as data and creature
composition in spikes. Do not authorize replacement APIs, package splits,
on-demand loading, public compatibility, or other advanced modules.
