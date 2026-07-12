# Phase 5B private package-boundary completion audit

Historical note: this audit proved the earlier private `0.0.0` boundary. The
Apache-2.0 unpublished public `0.1.0` candidate is audited separately in
`public-experimental-release-readiness.md` and current automated tests.

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Narrow dry-run inventory | 20 entries, 39,169 packed bytes | Proven. |
| 2 | Executable mapping/mode | `bin.lumen`, tar mode 0755 | Proven. |
| 3 | Production dependency closure | Clean tarball install plus import-closure test; root and production lock graph contain no install/prepare lifecycle execution | Proven. |
| 4 | Private/no library API | Package-boundary assertions | Proven. |
| 5 | Installed CLI workflow | Tarball `create → validate → export → verify-export` | Proven. |
| 6 | Inherited gates | 103 Node, 45 portable browser, headed GPU, build | Proven. |
| 7 | Publication blocked | No license/release policy; private `0.0.0` | Proven. |
| 8 | Manifest/lock root identity | Executable test compares exact name, version, dependency/devDependency maps, and engines | Proven. |

## Measured change

The pre-boundary dry run selected 155 entries, 6,026,861 packed bytes, and
6,780,026 unpacked bytes. The current candidate selects 20 entries, 39,169
packed bytes, and 166,568 unpacked bytes, including its third-party notice. It
excludes art, First Light, examples, research, tests, spikes, agent notes, CI,
and development configuration.

Phase 5K replaced source globs with an exact import-closure/resource allowlist,
so adding an internal source file cannot expand this inventory silently. Phase
3F deliberately added the shared creator write-lock source as the twentieth
entry; the closure test required the matching explicit allowlist change.

The first clean installation exposed a missing `src/project/schemas.js` import.
After adding that single file, the installed CLI successfully scaffolded and
validated a project, exported it, and verified the received export.

## Scope confirmation

This is a private packaging candidate, not a release. LumenJS still needs an
explicit project license, public package/name decision, release versioning,
support policy, and compatibility evidence before publication.

## Final verification

- `npm run check`: formatting, types, and 103/103 Node tests pass.
- `npm run test:browser`: the inherited 45/45 portable matrix passes across
  Chromium, Firefox, and WebKit; three GPU-only entries skip as designed.
- `npm run test:gpu`: headed Chromium passes on the First Light fixture.
- `npm run build` and `git diff --check`: pass.

The clean installed workflow was repeated after the Phase 5J cache isolation
and backup-record hardening. It again passed
`create → validate → rename apply → backups → restore apply → nested export →
verify-export` and the canonical-generation rejection after Phase 3F.
The documented installed form, `npx --no-install lumen --help`, also resolves
the local bin without registry fallback.
The current installed run also includes inspect, localized focus, and the
scaffolded recovery `.gitignore`; no lock/temp residue or `.gitignore` enters the
verified static export.
A clean install of then-current candidate shasum
`4143d41c24efbfdc4daa9da69c0f395269467f65` additionally preserves a ZWJ emoji
title through create/inspect, completes rename/backup/restore/nested-export
verification, proves control/newline-safe human CLI output, and reports zero
known production vulnerabilities.
