# Phase 4A encounter-context specification

Status: authorized for experimental implementation on 2026-07-12.

## Product question

Can two independently owned campaign concerns contribute deterministic
encounter context without field conflicts, hidden ordering, or scenario-name
branches?

## Source ownership

The experimental creator manifest may declare ordered context modules. Each
entry has a stable module ID, version 1, a project-relative JSON source, and an
optional flag. The source owns a non-empty object of namespaced or unique context
values. It contains no executable code.

Validation loads declared regular files, rejects unsafe paths/symlinks,
duplicate module IDs, unsupported versions, empty values, and field ownership
conflicts. Diagnostics identify both owners and a remedy.

Optional absence is valid only when the declared source is absent; required
absence fails. Present optional sources validate normally. Static export copies
present declared module data and records it in hashes.

## Runtime meaning

A pure resolver receives validated contributions in manifest order and returns
serializable values, per-field ownership, applied modules, and a deterministic
hash. It receives no DOM, storage, renderer, or module implementation objects.

The clean-room fixture declares two original consumers:

- `workshop-atmosphere` owns terrain and weather; and
- `careful-traveler` owns item and recovery policies.

Inspect exposes order, values, ownership, optional/presence status, and hash.
Focused playtest diagnostics include the resolved context but do not implement
battle effects yet.

## Acceptance criteria

1. Two independently removable consumers resolve through the same boundary.
2. Resolver output and hash are deterministic and serializable.
   Semantically identical nested JSON objects hash identically regardless of
   property insertion order; array and declared contribution order remain
   meaningful.
3. Every field exposes exactly one module/source owner.
4. Duplicate IDs, unsupported versions, unsafe sources, invalid values, and
   ownership collisions fail before focus state.
5. Required missing sources fail; optional missing sources are inspected as
   absent and do not enter resolved context.
6. Inspect, focus, and static export expose the same applied order/hash.
7. No scenario-name branch exists in resolver, validator, inspector, or focus.
8. Node and three-browser tests cover both present consumers and optional
   removal; inherited gates remain green.
9. The module shape remains internal/experimental and no package split occurs.
10. top-level context ownership keys are stable field identifiers: letters plus
    alphanumerics and optional `.`, `_`, or `-` namespace separators; empty,
    whitespace, punctuation-only, and inherited-object names fail schema
    validation before ownership or hashing.

## Deferred

Battlefield rendering, weather rules, challenge enforcement, dependencies
between modules, code loading, replacement APIs, module marketplaces, scaling,
creature composition, public compatibility, and on-demand loading are deferred.
