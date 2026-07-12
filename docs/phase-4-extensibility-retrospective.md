# Phase 4 extensibility retrospective

Retrospective date: 2026-07-12.

## What the trials established

- Two superficially different needs can share a contribution boundary when
  they independently own disjoint encounter-context fields.
- Replacement value came from removing battlefield or challenge meaning
  without editing encounter definitions, not from executable plugin machinery.
- Explicit ownership and provenance made conflict, order, version, and absence
  observable before deterministic state existed.
- Open-world scaling needed authored data, not a policy interface.
- Creature composition exposed useful ownership questions but lacked a second
  consumer and therefore did not justify production structure.

## What remains deliberately absent

- no executable third-party code loading;
- no package-level module distribution or dependency resolver;
- no public compatibility/versioning promise;
- no on-demand loading or global registry;
- no roguelite, side-activity, or bestiary subsystem without a real campaign;
- no generalized merge semantics beyond exactly owned context fields.

## Product consequence

The smallest extensibility result is data contribution with strong validation,
not a plugin framework. Phase 5 may research packaging, provenance, updates,
PWA behavior, devices, and compatibility around the artifacts that now exist.
It must keep optional operated services outside the core until their ownership
and lifecycle are funded and specified.
