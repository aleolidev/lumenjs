# Phase 5L locked CI-toolchain completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Locked local Playwright | Workflow uses `npx --no-install playwright` | Proven. |
| 2 | No npx fallback | `--no-install` plus local version check | Proven. |
| 2a | Exact npm selection | Corepack enables declared npm 11.6.1 | Proven. |
| 3 | SHA-pinned actions | Test asserts the exact three action/revision pairs and 40-hex form; upstream tag snapshot matches each pair | Proven. |
| 4 | Read-only contents | Workflow assertion | Proven. |
| 5 | Single portable lane | Workflow assertion for `npm run ci` | Proven. |
| 6 | No publication authority | Workflow has no release job or write permission | Proven. |
| 7 | No persisted checkout token | Checkout sets `persist-credentials: false`; executable workflow test asserts it | Proven. |
| 8 | Explicit runner family | Workflow and executable test require `ubuntu-24.04` and reject `ubuntu-latest` | Proven. |

## Verification

- `npx --no-install playwright --version` resolves the locked Playwright 1.60.0.
- README and development-environment setup use that same `--no-install`
  boundary before the documented local portable CI command.
- `corepack enable npm` makes CI honor `packageManager: npm@11.6.1` before
  `npm ci`.
- `npm run check`: formatting/types and 111/111 Node tests pass after adding the
  executable workflow contract.
- The existing workflow actions remain pinned by full commit SHA and its only
  declared permission remains `contents: read`.
Checkout also removes the implicit token from local Git configuration before
repository-controlled verification commands run.

An upstream `git ls-remote` snapshot on 2026-07-12 independently matched every
workflow SHA to its documented official tag:

| Action tag | Resolved SHA |
| --- | --- |
| `actions/checkout@v6.0.2` | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` |
| `actions/setup-node@v6.4.0` | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` |
| `actions/upload-artifact@v7.0.1` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |

This is a point-in-time tag-identity check, not an assertion that a tag is the
latest release or an independent security review of action contents.

## Decision

Phase 5L is complete. It narrows CI resolution behavior without adding a release
or publication workflow.
