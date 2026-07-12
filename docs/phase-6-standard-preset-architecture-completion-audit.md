# Phase 6 standard-preset architecture completion audit

Audit date: 2026-07-12.

Scope: consolidate the dialogue/encounter experimental baseline and convert the
pre-engine research taxonomy into an executable, ordered architecture program
for the official creature-RPG preset. This audit does not claim Goals 7–20 are
implemented, approve npm publication, promise Essentials/RPG Maker project
compatibility, or satisfy owner, service, real-device, assistive-technology, or
independent-project gates.

| # | Requirement | Authoritative evidence | Result |
| ---: | --- | --- | --- |
| 1 | Dialogue baseline is intentional | `minimum-dialogue-core-specification.md`, its completion audit, two-game source/tests/export | Proven as experimental v2 evidence. |
| 2 | Encounter baseline is intentional | `minimum-encounter-core-specification.md`, its completion audit, two-game source/tests/export | Proven as experimental v3 evidence. |
| 3 | Baseline contract decision | `phase-6-standard-preset-architecture-specification.md` “Baseline contract decision” | Proven: remains public only inside unpublished experimental candidate; no long-lived promise. |
| 4 | Every research capability is owned once | 73 taxonomy bullets and 73 exact rows in `research/executable-capability-matrix.md` | Proven by architecture test. |
| 5 | Every row is actionable | Matrix columns record reference, role, runtime/authoring owner, evidence target, goal, and status | Proven by inspection; no full-scope row is overstated as proven. |
| 6 | Goals 7–20 remain connected | Matrix goal cells plus central TODO goal definitions | Proven by architecture test. |
| 7 | Private target dependency graph | Architecture specification “Product assembly” and “Private target layers” | Proven as an internal direction, not public packages. |
| 8 | Present dependencies are enforceable | `src/architecture/layers.json` and production-import test | Proven for all current non-test source in recorded layers. |
| 9 | Stable identity and references | Architecture specification “Stable identity and references” | Decided for future specifications. |
| 10 | Editable sources and compilation | Architecture specification “Sources, compilation, and caches” | Decided; executable compiler work remains assigned to Goals 14/17. |
| 11 | Cache invalidation and clean equivalence | Compiler stages and semantic cache-key requirements | Decided; scale evidence remains assigned to Goal 17. |
| 12 | Independent version scopes | Architecture specification “Version and compatibility records” | Decided; module lock and compatibility remain assigned to Goal 15. |
| 13 | Structured diagnostic contract | Architecture specification “Diagnostics” | Decided; current coded diagnostics are supporting evidence. |
| 14 | Extension data cannot grant authority | Architecture specification “Extension-data policy” | Decided; public module enforcement remains Goal 15. |
| 15 | Event/effect boundary is explicit | Architecture specification “Event and effect boundary” | Decided; implementations remain Goals 7, 9, and 11. |
| 16 | Beginner defaults and escape hatches | Architecture specification “Standard-preset defaults and escape hatches” | Decided without claiming implementation. |
| 17 | Forbidden architecture is guarded | Import graph rejects cross-layer production imports and cycles; deterministic layers reject Node/DOM/fetch/storage/ambient clock/RNG/mutable-global access | Proven for present static source. |
| 18 | Publication and external gates preserved | Central TODO, Phase 6 exclusions, Phase 5 owner checklist | Proven by repository policy and absence of publication action in this work. |
| 19 | Ordered next work exists | Matrix assignments and central Goals 7–20 | Proven; Goal 7 is the first post-Phase-6 implementation goal. |
| 20 | Baseline verification remains reproducible | Commands and results below | Proven locally and remotely for the versioned baseline. |

## Verification record

- `npm run check`: formatting and types passed with 234 Node tests, including
  four new architecture fitness tests.
- `npm run test:browser`: 85 passed in Chromium, Firefox, and WebKit; five
  explicit GPU/redundant touch lanes skipped as designed.
- `npm run test:gpu`: one headed Chromium WebGPU test passed against both First
  Light continuity maps.
- `npm run check:release`: 25 reproducible packed files; SHA-256
  `cda04960652a8c94e9c3bddfb8b43fa79dc26762dcd5894ce782f71cfd5229d0`;
  clean JavaScript/TypeScript imports, CLI workflow, and static export passed.
- `node --test src/architecture/architecture.test.js`: four tests passed for
  layer imports, acyclic/deterministic boundaries, exact taxonomy coverage, and
  Goals 7–20 assignment.
- GitHub CI run `29191931738` passed for baseline commit `72a7a72` from a clean
  checkout, including the locked install and portable browser matrix.
- Cloudflare Pages rebuilt `main`; the public origin returned HTTPS 200 for the
  root, hashed JavaScript, JSON, and TMJ sources with the expected MIME/security
  headers. Its `index-CihrLr1B.js` and `index-D9U_CUGX.css` asset identities
  matched the audited local production build.

The browser, GPU, and tarball results exercised the exact runtime baseline.
Phase 6 subsequently added documentation, the architecture manifest, and Node
fitness tests without changing runtime/package behavior; the final Node gate
includes those additions.

The final audit-only commit changes no runtime, package, or production-build
input. Its own GitHub CI result is recorded before this goal is closed.

## Decision

Phase 6 establishes an evidence-driven architecture program, not a finished
engine architecture. The official preset may now be implemented in goal order
without returning to generic capability selection. Goal 7—general events,
dialogue, cutscenes, and quests—is next because it supplies campaign structure
needed by later world, battle, progression, tools, and proof-game work.

The current `createGame` API remains explicitly experimental. Dialogue and the
fixed encounter are valuable two-game precursors, but their in-repository
fixtures do not satisfy the independent-maintainer or long-lived compatibility
gates. npm remains unpublished.
