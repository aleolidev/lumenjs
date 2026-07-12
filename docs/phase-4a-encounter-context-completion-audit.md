# Phase 4A encounter-context completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Two removable consumers, one boundary | Atmosphere/challenge data and optional-removal tests | Proven. |
| 2 | Deterministic canonical output/hash | Repeat, nested-key-order, focus/inspect assertions | Proven. |
| 3 | Exactly one owner per field | Ownership map and conflict tests | Proven. |
| 4 | Declaration/source/value/conflict diagnostics | Five-case creator test matrix | Proven. |
| 5 | Required vs optional absence | Missing required and optional export/focus tests | Proven. |
| 6 | Inspect/focus/export agreement | Shared hash/context and exact file manifest | Proven. |
| 7 | No scenario-name branches | Resolver and consumers use only declared IDs/values | Proven. |
| 8 | Node/three-browser/inherited gates | 101 Node, 42 portable browser, headed GPU, build | Proven. |
| 9 | Internal experimental boundary | Specification and README | Proven. |
| 10 | Stable ownership keys | Schema `propertyNames` plus whitespace and reserved-key mutations reject ambiguous ownership before resolver state | Proven. |

## Scope confirmation

Phase 4A modules are JSON contributions, not executable plugins. The shape,
ordering, ownership record, hash, diagnostics, and absence behavior remain
experimental. Battlefield rendering/rules, challenge enforcement, dependencies,
code loading, replacements, marketplaces, scaling, composition, compatibility,
and package splits remain deferred.

The resolver later gained recursive object-key canonicalization after review
showed that nested contribution values could otherwise hash differently despite
equal JSON meaning. Arrays and contribution order are deliberately preserved.
