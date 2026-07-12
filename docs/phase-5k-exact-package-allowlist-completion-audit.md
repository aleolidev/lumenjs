# Phase 5K exact package-allowlist completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Explicit shipped files | `package.json` contains no source globs | Proven. |
| 2 | Exact closure equality | Recursive import test plus declared browser runtime resource | Proven. |
| 3 | Internal files excluded by default | No directory wildcard remains | Proven. |
| 4 | Intentional inventory | 20 entries after explicit Phase 3F closure addition | Proven. |
| 5 | Existing candidate properties | Package-boundary test and prior clean install | Proven. |
| 6 | No publication expansion | Private `0.0.0`, no library exports | Proven. |
| 7 | Effective npm inventory regression | Node test runs `npm pack --dry-run --json` with an isolated cache and asserts all 20 emitted paths, executable/regular modes, and no bundled dependencies | Proven. |

## Verification

- `npm run check`: formatting, types, and 110/110 Node tests pass.
- The exact allowlist contains the static import closure, the generated
  playtest's dynamically read browser resource, and the third-party notice.
- The current dry run selects 20 files, 39,169 packed bytes, and 166,568
  unpacked bytes.

## Decision

Phase 5K is complete. Package growth now requires an explicit manifest and test
change; this remains a private experimental CLI candidate.
