# Phase 4 extensibility completion audit

Audit date: 2026-07-12.

Phase 4 asked which advanced campaign needs require replaceable modules and
which should remain authored data or internal composition. Completion is a
research decision, not a claim that every candidate became a module.

| Roadmap outcome | Evidence | Result |
| --- | --- | --- |
| Distinct advanced needs | Four original disposable scenarios | Proven. |
| Contextual battlefields | Shared ordered context boundary | Proven experimentally. |
| Challenge overlays | Independently removable policy contribution | Proven experimentally. |
| Open-world scaling | Deterministic authored bands and milestone curve | Keep as data. |
| Compositional creatures | Slot ownership/provenance spike with one consumer | Defer integration. |
| Roguelite runs and side activities | No concrete consumer or replacement benefit | Not authorized. |
| Ownership and ordering | Declared fields, stable order, source provenance | Proven for context. |
| Conflict/version/absence diagnostics | Creator validation failure matrix | Proven for context. |
| Deterministic serialization | Resolved context hash and inspection | Proven for context. |
| Optional removal | Focus/export/browser test without challenge data | Proven. |
| Multiple consumers | Battlefield and challenge scenarios use one boundary | Proven. |
| Compatibility policy and public API | Insufficient multi-project evidence | Remain internal. |

## Verification record

- `npm run check`: formatting, types, and 102/102 Node tests pass.
- `npm run test:browser`: 42/42 portable tests pass across Chromium, Firefox,
  and WebKit; three GPU-only matrix entries skip as designed.
- `npm run test:gpu`: headed Chromium passes on the First Light fixture.
- `npm run build` and `git diff --check`: pass.

## Completion decision

The research question is answered narrowly. Phase 4A is the only authorized
integration: an internal, data-only encounter-context contribution boundary.
Scaling stays ordinary authored data. Creature composition stays in a spike.
Executable plugins, package splits, on-demand loading, broad replacement APIs,
and compatibility promises remain unjustified.

This closes Phase 4 without manufacturing abstractions merely to populate the
roadmap. A future real project may reopen a boundary with new evidence.
