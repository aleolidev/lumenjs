# Public experimental release preparation completion audit

Audit date: 2026-07-12.

Scope: prepare, but do not publish, the LumenJS CLI for npm; publish the
experimental First Light site on Cloudflare Pages under Apache-2.0; add clean
installation evidence and a second validation project without declaring
definitive engine modules.

| # | Requirement | Authoritative evidence | Result |
| ---: | --- | --- | --- |
| 1 | Apache-2.0 selected and transported | Root `LICENSE`, package/lock SPDX metadata, README, notices, licensing audit, exact tarball inventory | Proven. |
| 2 | Public npm candidate, not a library API | `lumenjs@0.1.0`, public `next` publish config, sole `lumen` bin, no main/module/exports | Proven locally. |
| 3 | No npm publication or stored credentials | Public Git remote; no registry token; read-only manual candidate workflow; separate gated publish workflow | Proven. |
| 4 | Clean installation workflow | `npm run check:release` packs twice byte-identically, installs from tarball, then creates, validates, inspects, focuses, exports, and verifies | Proven. |
| 5 | Cloudflare Pages deployment | Git integration limited to `lumenjs`; protected `main`; Node 22 build; public HTTPS origin and live First Light | Core origin proven; extended offline/update/rollback matrix remains. |
| 6 | Second validation project | Tideglass Reach has distinct project/map/creature identity; automated validate, Spanish focus, export, and received-export verification | Proven locally. |
| 7 | No definitive modules | No library entry point; README, AGENTS, release policy, package audit, and inspection policy keep schemas/modules internal and experimental | Proven. |
| 8 | Regression baseline | Formatting, type checks, 212 Node tests, build, Cloudflare check, 81 portable browser tests, and headed WebGPU test | Proven. |

## Measured candidate

The final clean verifier selected 21 files and produced repeated byte-identical
tarballs with SHA-256
`6ef08bc8edc7adebe512c10c04c71fa5c6b79f5ffa65a352599d3b61a5459f15`.
Production audit reported zero known vulnerabilities. Registry verification
reported 32 dependency signatures and 14 attestations; those dependency facts
do not sign or publish LumenJS itself.

## External handoff

The public Git remote and core Cloudflare deployment now exist. npm publication
still requires registry ownership, the initial owner-authenticated bootstrap,
Trusted Publishing configuration after the package exists, and explicit owner
approval. Extended Cloudflare online/offline, update, rollback, and clean-origin
evidence remains listed in `cloudflare-pages-deployment.md`.

Physical devices, assistive technology, installable PWA, independent maintenance,
long-lived compatibility, and operated services remain outside this preparation
scope. None is implied by the candidate.
