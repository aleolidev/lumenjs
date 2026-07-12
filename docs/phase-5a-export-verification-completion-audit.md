# Phase 5A received-export verification completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Fresh export, human and JSON CLI | Integrated creator CLI test | Proven. |
| 2 | Stable identity/version/sorted hashes | Direct verifier assertions | Proven. |
| 3 | JSON/format/shape/hash diagnostics | Failure matrix | Proven. |
| 4 | Unsafe/reserved paths and symlinks | Failure matrix includes traversal, hidden `.LUMEN`, inherited-object names, controls, URL delimiters `#`/`%`, platform-reserved names, and symlinks; offending paths are identified with terminal-safe Unicode escaping | Proven. |
| 5 | Missing/unexpected/changed files | Distinct coded failures | Proven. |
| 6 | Inert and deterministic | Full before/after byte comparison | Proven. |
| 7 | Inherited gates | 103 Node, 45 portable browser, headed GPU, build | Proven. |
| 8 | Experimental, no authenticity claim | Specification and README boundary | Proven. |
| 9 | Exact directory tree | Unexpected empty directory has a distinct coded failure | Proven. |

## Verification record

- `npm run check`: formatting, types, and 103/103 Node tests pass.
- `npm run test:browser`: 45/45 portable tests pass across Chromium, Firefox,
  and WebKit; three GPU-only matrix entries skip as designed.
- `npm run test:gpu`: headed Chromium passes on the First Light fixture.
- `npm run build` and `git diff --check`: pass.

## Scope confirmation

`verify-export` establishes deterministic integrity and exact inventory relative
to the manifest stored in the same export. It does not establish publisher
identity, trusted origin, timestamp, transparency, or cryptographic
authenticity. The format and CLI remain experimental.
