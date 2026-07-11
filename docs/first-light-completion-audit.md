# First Light completion audit

Audit date: 2026-07-11.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Clean install and documented playtest command | `README.md`, lockfile, successful `npm ci --ignore-scripts` | Proven locally. |
| Structural and semantic validation before runtime | `src/project/`, Node validation tests | Proven. |
| Source-linked broken references | Broken fixture and missing-object test | Proven. |
| Validated deterministic simulation | `src/simulation/`, movement/interaction tests | Proven. |
| Canonical replay, state hash, and facts | `replay.json`, deterministic replay test | Proven. |
| Rectangular top-down 2.5D camera | Scene projection contract, semantic test, headed visual inspection | Proven for the fixture. |
| 2D textures and transparent sprites | Original atlas/sprites, texture diagnostics, headed GPU lane | Proven. |
| Optional simple 3D structure | Textured house roof/front geometry and semantic count | Proven for one fixture case. |
| Optional shaders | Classic/enhanced control and state-invariance browser test | Proven. |
| WebGPU depth and bridge interleaving | Scene builder, semantic depth test, headed GPU lane | Proven for the fixture. |
| Explicit unsupported-WebGPU behavior | Renderer capability result and three-browser load test | Proven. |
| Required diagnostics | Playtest diagnostics and browser assertions | Proven. |
| Node, three-engine browser, and headed GPU tests | `npm run check`, `test:browser`, and `test:gpu` | Proven locally. |
| Original fixture and provenance | `first-light-provenance.md`, generated sources and delivered assets | Proven by repository record. |
| Boundary retrospective | `first-light-retrospective.md` | Proven. |
| Production build | Successful `npm run build` | Proven locally. |

## Scope confirmation

First Light does not implement battles, creature collection, saves, audio,
touch/gamepad parity, a built-in editor, third-party modules, publication, or a
general event language. None of its internal boundaries are declared public.

The acceptance criteria in `docs/product-specification.md` are satisfied at the
prototype boundary. Future device coverage and product-quality art are later
phase work, not claims made by this prototype.
