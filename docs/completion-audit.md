# Pre-engine research completion audit

Audit date: 2026-07-11.

Objective audited: complete LumenJS technical research, score and assign
references per capability, run necessary spikes, and leave a fully designed and
verified development environment without implementing engine architecture.

## Requirements and evidence

| Requirement | Authoritative evidence | Result |
| --- | --- | --- |
| Product/domain research | `docs/research/capabilities.md`, `corpus.md`, `findings.md`, `matrix.md` | Proven for the pre-engine scope. |
| Technical repository research | `technical-sweep.md` and audits for renderers, tooling, simulation, persistence, modules, and browser platform | Proven across all identified foundational areas. |
| Repeatable evaluation method | `method.md` and `scoring.md` | Proven. |
| Scored references per capability | `capability-assignments.md` | Proven; confidence and gaps are explicit. |
| Core/module/tooling classification | `classification.md` | Proven as a working classification, not architecture. |
| Necessary technical spikes | `spikes/` and `docs/research/spikes.md` | Proven for schemas, simulation, maps, WebGPU, QA, and persistence. |
| Development environment design | `docs/development-environment.md` | Proven. |
| Materialized environment | `package.json`, lockfile, Biome, checkJs, Playwright, Vite, npm config, Node pin, CI | Proven. |
| Reproducible installation | Successful `npm ci --ignore-scripts` from lock | Proven locally. |
| Static/unit verification | Successful `npm run check`: Biome, checkJs, 9 Node tests | Proven locally. |
| Cross-browser verification | Successful `npm run test:browser`: 15 tests in Chromium, Firefox, WebKit | Proven locally. |
| WebGPU verification | Successful `npm run test:gpu`: adapter/device, render submission, benchmark | Proven in headed Chromium on this machine. |
| Supply-chain baseline | `npm audit`: 0 vulnerabilities; signature audit: 32 verified signatures, 14 attestations | Proven for current locked tree. |
| CI configuration | YAML parses; actions pinned to immutable release SHAs; Dependabot covers npm and actions | Proven syntactically; remote run awaits a GitHub remote. |
| No engine architecture implementation | No `src` directory; experiments isolated under `spikes/`; AGENTS forbids premature structure | Proven. |

## Scope boundary

"Complete research" here means the foundational pre-engine decision set needed
to begin technical specification and vertical prototypes. It does not mean that
future feature-specific research is exhausted. New concrete systems will create
new questions and should reopen targeted research rather than relying on this
snapshot indefinitely.

The following are intentionally future validations, not missing environment
work today, because no corresponding production runtime/editor feature exists:

- real iOS/Android/Windows GPU and thermal coverage;
- audio routing/interruption and physical gamepads;
- screen-reader/manual accessibility testing of a future editor and game UI;
- quota exhaustion, multi-tab migration, and mobile eviction at production save
  sizes;
- hostile plugin sandboxing and cloud operations;
- consumer package and publication workflows before a public package exists.

These gates are already assigned in the environment design and become mandatory
when their feature enters scope.

## Decisions now supported by evidence

- Build LumenJS itself rather than wrap or fork an existing engine.
- Keep one npm package until independent release boundaries are demonstrated.
- Use a small core direction, official modules, and beginner-facing presets,
  while deferring actual API/package boundaries to real cases.
- Use browser APIs for input, audio, lifecycle, responsive behavior, and
  capability detection.
- Use a specialized hybrid 2.5D renderer; choose static texture-backed or
  instanced/geometry tile paths by layer semantics and measured behavior.
- Keep simulation synchronous and deterministic with validated inputs,
  versioned RNG, structured facts, and replayable input logs.
- Keep Lumen-owned schemas and IDs; use Ajv for structural validation and
  separate semantic checks.
- Integrate Tiled externally first and keep project gameplay metadata typed and
  Lumen-owned.
- Use IndexedDB generational snapshots through a minimal `idb` boundary;
  portable backups are required and cloud sync remains external.
- Use npm ESM modules, one lockfile, explicit capabilities, and clear trust
  tiers; npm distribution does not imply sandboxing or trust.
- Use Vite, Playwright, Biome, TypeScript checkJs, and Node tests as tooling,
  never runtime architecture.

## Audit conclusion

The objective is satisfied at the pre-engine boundary. The repository is ready
for the next product phase: converting the capability map into a prioritized
technical specification and selecting the first real vertical prototype. That
next phase must not silently promote spike code into the engine.
