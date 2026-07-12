# Development environment

Status: designed in the pre-engine research phase and updated through the
experimental creator/distribution phases.

This environment exists to give maintainers and autonomous agents reproducible
feedback before LumenJS defines its engine architecture. It deliberately avoids
a monorepo, runtime framework, transpilation requirement, or treating the
current experimental `src` boundaries as a settled engine architecture.

## Baseline

- One npm package until multiple independently releasable packages are
  demonstrated.
- Node.js 22, recorded in `.nvmrc` and `engines`.
- npm 11 with a committed `package-lock.json`; `npm ci` is the reproducible
  installation path.
- Native ESM JavaScript. TypeScript checks JavaScript/JSDoc without changing the
  runtime language or requiring emitted/transpiled code.
- Browser-native runtime APIs by default.
- Exact development dependency versions.

## Current tools

| Tool | Version | Role | Runtime dependency? |
| --- | ---: | --- | --- |
| Node test runner | Node 22 | Unit, simulation, schemas, importers | No |
| Biome | 2.4.16 | Formatting and linting | No |
| TypeScript | 6.0.3 | `checkJs` static analysis | No |
| Vite | 8.0.16 | Development server and browser fixtures | No |
| Playwright | 1.60.0 | Chromium/Firefox/WebKit E2E and traces | No |
| Ajv | 8.20.0 | Creator-project schema validation | Yes, public experimental CLI candidate |
| idb | 8.0.3 | Bundled First Light persistence and browser spikes | No, not in CLI package |
| WebGPU types | 0.1.69 | Static API declarations | No |

Ajv became the sole direct production dependency after the creator validator
and clean tarball installation proved its CLI boundary. `idb` remains outside
the CLI candidate because the published-file allowlist excludes First
Light and browser spikes.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci --ignore-scripts` | Recreate the locked dependency tree without lifecycle scripts. |
| `npx --no-install playwright install chromium firefox webkit` | Install browser binaries through the locked local Playwright CLI. |
| `npm run format` | Apply formatter and safe lint fixes. |
| `npm run check` | Formatting/lint, checkJs, and all Node tests. |
| `npm run test:browser` | Headless semantic/E2E matrix in three engines. |
| `npm run test:gpu` | Serial headed Chromium WebGPU smoke/benchmark lane. |
| `npm run ci` | Required check, production build, and portable browser matrix. |
| `npm run dev:spikes` | Serve isolated browser experiments. |

The headed GPU lane is separate because the local headless engines currently do
not expose WebGPU. It must never report fallback rendering as GPU success.

## Quality gates

Every ordinary change must pass:

1. Biome formatting and recommended lint rules.
2. JavaScript static analysis with `checkJs`.
3. Deterministic Node tests.
4. Chromium, Firefox, and WebKit semantic browser tests when browser behavior
   changes.
5. Relevant schema, migration, fixture, and compatibility checks.

Renderer changes additionally need:

- headed WebGPU smoke where a GPU is available;
- capability/limits diagnostics;
- metric assertions before pixel goldens;
- serial benchmarks with warmup and recorded environment;
- fallback behavior in the headless cross-browser lane.

Public API or persistent-format changes additionally need:

- explicit compatibility impact;
- fixtures from older supported versions;
- migration, rollback, and missing-module behavior;
- documentation and executable example updates.

## Testing layers

### Pure Node

Use the built-in test runner for simulation, rules, schemas, codecs, importers,
migrations, package resolution, and deterministic replays. Tests must inject
time and randomness rather than use wall-clock time or global `Math.random`.

### Browser matrix

Playwright runs semantic behavior in Chromium, Firefox, and WebKit. Capture
traces and screenshots only where they improve diagnosis. Cross-engine pixel
identity is not a default requirement because GPU, fonts, DPR, and rasterization
differ.

### GPU

Run headed Chromium locally for WebGPU smoke. Future nightly infrastructure
must add real browser/GPU combinations and WebGPU CTS subsets. Physical Safari,
iOS/iPadOS, Android tiers, Windows iGPU/dGPU, and Firefox remain periodic device
gates; Playwright emulation is not evidence for those properties.

### Creator workflow

When an editor exists, E2E fixtures must cover project creation, data/map/event
editing, focused playtest, diagnosis, save migration, build, and static export.
Every official module must contribute its own authoring and debug fixtures.

## CI

The GitHub Actions workflow uses Node 22, enables the declared npm 11.6.1
through Corepack, runs `npm ci --ignore-scripts`, installs the three Playwright
engines only from the locked local package, and invokes `npm run ci`, which
includes the production build.
Failed browser diagnostics are kept for seven days. It intentionally excludes
headed WebGPU because generic hosted runners do not prove a real GPU path.

Before publishing begins, add separate workflows for:

- nightly real-GPU/device lanes;
- repeatable package packing and consumer-install fixtures (currently proven
  locally for the unpublished candidate only);
- SBOM, licenses, signatures, and provenance;
- staged npm publication through OIDC with approval and 2FA.

## Dependency policy

- Browser APIs first; a library must remove demonstrated complexity or defects.
- Exact versions and one npm lockfile.
- No install lifecycle script without explicit review.
- Inspect `npm pack --dry-run`, exports, files, license, provenance, maintenance,
  tests, bundle cost, and alternatives before adoption.
- A formatter/build/test dependency never becomes a runtime dependency.
- Wrap tooling only where version churn would otherwise leak into project or
  public APIs.
- Remove a dependency when the wrapper becomes simpler and safer than keeping it.

## Module environment

Future modules use ordinary npm ESM packages, closed exports, peer compatibility
with LumenJS, and a validated `lumen` manifest. A module declares capabilities,
permissions, schemas, migrations, and runtime/editor/worker entries.

Presets hide assembly from beginners. npm resolves and locks packages; LumenJS
validates compatibility and capabilities but does not invent a package manager.

Initial editor plugins are trusted reviewed code. Workers are not security
sandboxes, and `node:vm` is not a security boundary. Untrusted browser plugins
would require a dedicated/opaque-origin iframe and narrow message protocol;
hostile editor plugins require process-level isolation or a future audited SES
design.

## Project data and saves

- Lumen-owned, versioned, human-readable source data with stable IDs.
- JSON Schema for portable structural contracts; semantic validators for
  references and domain invariants.
- Disposable compiled/import caches; never two competing sources of truth.
- IndexedDB generational snapshots for browser saves, with checksums and
  previous-generation recovery.
- OPFS only for demonstrated large binary/cache needs.
- Portable export/import independent of File System Access support.
- Cloud synchronization as an external service/module.

## Observability requirements

The environment must eventually expose:

- simulation seed, inputs, state hash, and structured facts;
- module versions, capabilities, permissions, and migrations;
- frame phase timings, draw/dispatch counts, uploads, cache hit rates, and
  approximate memory;
- GPU timestamps only when supported, clearly labeled otherwise;
- adapter features/limits, DPR, viewport, quality tier, lifecycle, and save
  diagnostics;
- replay and focused fixture export for bug reports.

Logs must be structured, bounded, privacy-aware, and useful without proprietary
content.

## Source layout policy

The current `src` boundaries were promoted only from validated vertical cases
and remain experimental rather than a public architecture. Research experiments
stay under `spikes/` until deliberately rejected, retained as evidence, or
promoted after answering their questions.

## Verified state

The original 2026-07-11 research baseline grew into the audited First Light,
campaign, creator, extensibility, and distribution fixtures. The current local
baseline is recorded in the latest phase completion/progress audits rather than
duplicated as fixed counts here. It includes formatting/types, Node tests, the
three-engine browser matrix, production build, a separate headed-WebGPU lane,
static-export verification, and a clean private-tarball CLI installation.

Physical-device, audio, gamepad, assistive-technology, quota exhaustion,
multi-tab migration, post-initialization WebGPU device-loss recovery, and real
Safari/iOS/WebGPU coverage remain future gates that require corresponding
runtime features or external hardware. They are not claims of the current
pre-engine environment.
