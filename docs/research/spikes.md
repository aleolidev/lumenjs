# Technical spikes

Spike code lives under [`spikes/`](../../spikes/), outside `src`. It is evidence,
not production architecture.

## Schema and module-owned data

Question: can Lumen-owned JSON Schema validate portable project structure while
modules contribute data and semantic cross-reference checks?

Setup:

- Ajv 8.20.0 with JSON Schema 2020-12.
- A core project schema, a quest-module schema, and an event reference check.
- Structural and semantic errors collected in one result.

Result: passed three Node tests. The experiment validates separation between
portable structural schemas and domain/cross-reference validation. It also
demonstrates that module data can be rejected when its module is not installed.

Decision: advance Ajv to environment dependency candidate. Keep schemas
Lumen-owned and versioned; do not use coercion/default mutation as migration.

## Deterministic simulation and replay

Question: can a small synchronous boundary provide legal choices, explicit RNG,
structured facts, deterministic replay, and exact scripted randomness?

Setup:

- Serializable state transitioned only by validated actions.
- Version-named local `xorshift32-v1` stream for the spike.
- Replay envelope with engine/schema/module versions, data hash, seed, and
  ordered inputs.
- Structured output facts separated from replay inputs.

Result: passed four Node tests covering identical replay, seed divergence,
scripted edge cases, and invalid-action rejection.

Decision: validate this boundary further with effect ordering and state hashes.
The spike algorithm is not a production PRNG selection or battle API.

## Tiled source plus typed Lumen metadata

Question: can Tiled own spatial editing while Lumen owns typed gameplay metadata
without making Tiled's generic properties the canonical domain model?

Setup:

- A small Tiled JSON map fixture.
- A separate Lumen metadata sidecar keyed by stable event name.
- Import step that resolves positions and fails on broken references.

Result: passed two Node tests, including removal of a referenced map object.

Decision: external Tiled + Lumen sidecar/import cache is viable for early work.
Round-trip edits, duplicate IDs, infinite/chunked maps, templates, worlds, and
2.5D elevation still require dedicated spikes.

## Cross-browser harness and fallback scene

Question: can the environment launch the same fixture in Chromium, Firefox, and
WebKit, collect diagnostics, and retain a usable narrow-screen fallback?

Setup:

- Vite 8.0.16 development server.
- Playwright 1.60.0 with pinned Chromium, Firefox, and WebKit projects.
- Canvas fallback scene, capability probe, semantic pixel sample, and narrow
  touch viewport assertion.

Result: six browser tests passed. Observed capability probes in the Playwright
headless environment:

| Browser project | WebGPU | Canvas 2D | DPR |
| --- | --- | --- | ---: |
| Chromium | unavailable | available | 1 |
| Firefox | unavailable | available | 1 |
| WebKit | unavailable | available | 2 |

A separate headed Chromium lane exposed WebGPU with
`maxTextureDimension2D = 8192`, `maxBindGroups = 4`, and the baseline
`core-features-and-limits` feature. It successfully configured a WebGPU canvas,
submitted a render pass, and awaited queue completion. The Codex in-app browser
reported the same limits and feature set.

Decision: Playwright is validated for flows, layout, traces, fallback behavior,
and non-GPU browser tests. Headed Chromium can provide a local WebGPU smoke lane;
the headless matrix cannot. Broader WebGPU correctness still needs headed and
real-device lanes. Tests must report `skipped/unavailable` rather than silently
treating fallback as GPU success.

## WebGPU tile strategy benchmark

Question: for a static 64×64 tile layer, what is the baseline cost difference
between one instanced draw containing 4,096 tiles and one full-layer draw backed
by a 64×64 texture?

Setup:

- Headed Chromium on the same adapter and device.
- 512×512 offscreen `rgba8unorm` target.
- 120 render passes per sample after warmup.
- One draw call per pass in both strategies.
- Measurement includes CPU encoding/submission and queue completion; GPU
  timestamp queries were unavailable.
- Five sequential samples with one worker to avoid deliberate GPU contention.

Observed average milliseconds per pass:

| Sample | Instanced 4,096 tiles | Texture-backed layer |
| ---: | ---: | ---: |
| 1 | 0.149 | 0.185 |
| 2 | 0.248 | 0.071 |
| 3 | 0.216 | 0.104 |
| 4 | 0.349 | 0.072 |
| 5 | 0.492 | 0.060 |
| Median | **0.248** | **0.072** |

The texture layer uploaded 16 KiB; the instance buffer uploaded 64 KiB. A
parallel-worker run produced a 3 ms instanced outlier, confirming that this
microbenchmark is sensitive to GPU contention and must run serially.

Decision: texture-backed layers deserve a static-terrain path and were roughly
3.4× cheaper at the median in this constrained experiment. They are not a
universal tile representation: per-tile transforms, independent depth,
animation, lighting, picking, and object interleaving favor instances or
geometry. The likely design is multiple measured paths selected by layer
semantics, not one renderer for every tile.

This result is local evidence, not a cross-device performance claim. Real maps,
atlases, camera movement, partial updates, alpha/depth, mobile devices, and GPU
timestamps remain future benchmark dimensions.

## IndexedDB generational save

Question: can a tiny `idb` wrapper commit a complete snapshot and pointer
atomically, request strict durability, detect logical corruption, and recover a
previous generation in every automated browser engine?

Setup:

- `idb` 8.0.3.
- Separate snapshot and pointer stores updated in one transaction.
- SHA-256 computed before the transaction.
- Append-only parent chain and recovery from an intentionally corrupted current
  generation.
- Storage persistence and quota diagnostics without assuming persistence.

Result: nine persistence tests passed across Chromium, Firefox, and WebKit:
atomic save/load, corruption fallback, and storage diagnostics in each engine.
Together with the existing browser checks, the matrix now runs 15 passing tests.

Decision: advance `idb` as the baseline persistence dependency candidate. The
spike validates the transaction/generation shape but not its current API or data
layout. Multi-tab upgrades, locks, quota exhaustion, private mode, large saves,
migration failure, and physical mobile eviction still require later fixtures.

## Verification command

At this point:

```text
npm run check:spikes   # 9 passing Node tests
npm run test:browser   # 15 passing tests across 3 browser projects
npx playwright test --headed --project=chromium  # 2 passing; WebGPU submitted
```

The browser command requires permission to bind a local port and launch browser
processes in the current sandboxed environment.
