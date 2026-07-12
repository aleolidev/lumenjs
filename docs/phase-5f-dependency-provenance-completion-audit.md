# Phase 5F dependency-provenance completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | All direct dependencies noticed | Exact package/notice test | Proven. |
| 2 | Exact direct version | Ajv 8.20.0 package/lock assertion | Proven. |
| 3 | SPDX matches metadata | MIT installed/lock/notice assertion | Proven. |
| 3a | Upstream matches metadata | Installed repository and notice URL assertion | Proven. |
| 4 | Direct/transitive distinction | Notice text and audit snapshot; executable lock audit requires every resolved package to use the npm HTTPS registry with SHA-512 integrity and non-empty license metadata | Proven. |
| 5 | Notice in tarball | Current exact 20-entry dry-run inventory | Proven. |
| 6 | Not a license-text substitute | Explicit notice language | Proven. |
| 7 | LumenJS license blocker visible | Notice and private package state | Proven. |
| 8 | Existing gates | 104 Node, 48 portable browser, headed GPU, build | Proven. |

`npm audit --omit=dev --json` reported zero production vulnerabilities at the
2026-07-12 audit time (0 info/low/moderate/high/critical across six production
packages). This is a registry snapshot, not a future security guarantee.

A separate full `npm audit --json` snapshot also reported zero known
vulnerabilities across the locked development/build tree: 0 at every severity,
with npm reporting 69 total dependency entries (6 production, 64 development,
42 optional, and 2 peer; categories overlap). This result covers the current
registry advisory database only and does not turn development dependencies into
tarball runtime dependencies.

## Resolved transitive snapshot

The repository lockfile resolved the private CLI dependency graph as follows:

| Package | Version | SPDX |
| --- | --- | --- |
| ajv | 8.20.0 | MIT |
| fast-deep-equal | 3.1.3 | MIT |
| fast-uri | 3.1.3 | BSD-3-Clause |
| json-schema-traverse | 1.0.0 | MIT |
| require-from-string | 2.0.2 | MIT |

This table is an audit snapshot, not a guarantee of transitive versions in a
future consumer install. Each installed npm package retains its own license
files and metadata.

## Registry signature snapshot

`npm audit signatures` completed successfully on 2026-07-12 and reported 32
packages with verified registry signatures and 14 with verified attestations.
Those are npm registry statements about the currently installed dependency
artifacts. They do not sign this repository, the LumenJS tarball candidate, a
creator project, or a static export, and they are not a guarantee that every
future dependency artifact will carry an attestation.

The separate clean production installation of current tarball shasum
`b163a8b2…` reports five dependency packages with verified registry signatures;
it reports no attestation count. This consumer-only result excludes the private
unsigned LumenJS root package and the workspace development toolchain.
