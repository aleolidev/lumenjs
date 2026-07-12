# Phase 4 extensibility research plan

Status: research completed after the verified Phase 3 completion audit on
2026-07-12. This document retains the opening plan; no public module contract is
authorized. Outcomes are recorded in `research/phase-4-extensibility-trials.md`,
`phase-4-extensibility-completion-audit.md`, and
`phase-4-extensibility-retrospective.md`.

## Product question

Which advanced campaign needs genuinely require replaceable modules, and which
should remain ordinary authored data or composition inside one runtime?

## Trial campaigns

Four small original scenarios isolate different pressure:

1. **Tideglass Arena — contextual battlefields.** Encounters inherit authored
   terrain and weather context that changes presentation and selected move tags,
   without changing creature identity.
2. **Longroad Wilds — open-world scaling.** Regions declare threat bands and an
   authored curve maps deterministic campaign milestones to encounter strength.
3. **Cinder Vow — challenge overlay.** A run enables optional constraints such
   as no items and limited recovery without forking encounter definitions.
4. **Mosaic Kin — compositional creatures.** Original creatures combine body,
   marking, temperament, and move-set components with explicit provenance.

These are research fixtures, not promises for the standard preset.

## Questions

- Do contextual battlefields and challenge overlays need the same ordered,
  inspectable contribution boundary, or only superficially similar objects?
- Is scaling a replaceable policy or authored campaign data consumed by core?
- Does creature composition affect identity, presentation, rules, provenance,
  or all four, and can those owners remain separate?
- Which state belongs in deterministic replay/save meaning?
- How are module absence, ordering, conflicts, versions, and diagnostics shown?
- Can a module be removed without making creator data unreadable?

## Trials

### Trial A: context contributions

Represent battlefield and challenge needs as independently produced immutable
contributions. Combine them in declared order, record provenance for every
field, reject ownership collisions, and hash the resolved context. Compare this
with hard-coded merging and nested conditionals.

### Trial B: scaling ownership

Model authored region bands plus a deterministic milestone. Compare a plain
data resolver with a replaceable policy interface. Prefer data if no second
scaling strategy needs interchangeability.

### Trial C: composition ownership

Resolve a creature from independently sourced identity, visual, temperament,
and move components. Record component provenance and reject incompatible or
duplicate ownership. Do not build an art pipeline.

### Trial D: failure/removal

For every prototype, remove a contribution, change order, duplicate an owner,
and use an unsupported version. Diagnostics must explain source and remedy
before deterministic state exists.

## Decision gates

1. At least two distinct scenarios consume the same boundary without
   scenario-name branching.
2. Replacement or independent distribution has a concrete benefit over plain
   data/functions.
3. Ownership, dependency direction, ordering, conflict, absence, version, and
   deterministic serialization are explicit.
4. Creator diagnostics and inspection expose every active contribution.
5. Save/replay meaning remains independent of module implementation objects.
6. Removing an optional module has a defined validation outcome.
7. Tests prove two consumers plus failures before production integration.
8. The boundary remains internal until another project validates compatibility.

## Historical next step (completed)

The planned browser-free disposable prototypes under `spikes/` were completed,
measured, and used to authorize only the internal Phase 4A encounter-context
boundary.
