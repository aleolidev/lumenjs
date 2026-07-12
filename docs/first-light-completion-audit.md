# First Light completion audit

Audit date: 2026-07-12 re-audit; original acceptance 2026-07-11.

| # | Product acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Clean install and documented focused-playtest command | `README.md`, lockfile, successful `npm ci --ignore-scripts` | Proven locally. |
| 2 | Structural and semantic validation before runtime state | `src/project/`, Node validation tests | Proven. |
| 3 | Source-linked broken references and stable object ID | Private test fixtures and missing-object tests | Proven. |
| 4 | Synchronous deterministic simulation boundary | `src/simulation/`, movement/interaction tests | Proven. |
| 5 | Canonical replay, versioned state hash, and facts | Private Phase 1 replay plus public continuity replay; deterministic Node tests; three-engine HTTP-failure/inert-state/retry browser regression | Proven. |
| 6 | WebGPU camera, sprites, tiles, and interleaving | Rectangular top-down 2.5D projection; original atlas/transparent sprites; textured simple-3D house; classic/enhanced state invariance; bridge depth semantics; headed GPU diagnostics | Proven for the fixture. |
| 7 | Explicit unsupported-WebGPU behavior | Renderer capability result plus three-browser injected adapter/device request rejections that keep project load ready | Proven. |
| 8 | Required project/input/simulation/renderer diagnostics | Playtest diagnostics and browser assertions | Proven. |
| 9 | Node, three-engine browser, and headed GPU tests | `npm run check`, `test:browser`, and `test:gpu` | Proven locally. |
| 10 | Original fixture and recorded provenance | `first-light-provenance.md` records generation/adaptation and SHA-256 identity for all three delivered images plus both retained chroma sources; Node verifies every file/hash row | Proven by repository record. |
| 11 | Boundary retrospective before public API | `first-light-retrospective.md` | Proven. |
| 11a | Additional production-build gate | Successful `npm run build`; a Node regression requires the exact ten-file public inventory and excludes all seven test-only negative/migration/replay fixtures kept under `tests/fixtures/first-light` | Proven locally. |

## Scope confirmation

At its original acceptance, Phase 1 did not implement battles, creature
collection, saves, audio, touch/gamepad coverage, a built-in editor, third-party
modules, publication, or a general event language. Later accepted phases now
extend the same private First Light fixture with the scoped campaign,
continuity/persistence, and emulated touch work recorded by their own audits;
that later evidence does not retroactively broaden Phase 1 or declare any
internal boundary public. Audio, physical-device/gamepad parity, a built-in
editor, executable third-party modules, publication, and a general event
language remain outside the current claim.

The acceptance criteria in `docs/product-specification.md` are satisfied at the
prototype boundary. Future device coverage and product-quality art are later
phase work, not claims made by this prototype.
The current whole-repository verification baseline is maintained in
`phase-5-distribution-progress-audit.md`; this audit preserves the original
fixture decision and its requirement mapping.
