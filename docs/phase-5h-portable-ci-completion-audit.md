# Phase 5H portable CI completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | One portable CI command | `npm run ci` runs check, build, then browser tests | Proven. |
| 2 | Workflow uses that command | `.github/workflows/ci.yml` invokes `npm run ci` | Proven. |
| 3 | WebGPU remains separate | `test:gpu` is not part of generic hosted CI | Proven. |
| 4 | No expanded release claims | Package stays private and unsigned; no device claims | Proven. |
| 5 | Documentation matches reality | Environment records Ajv and experimental source boundaries | Proven. |
| 6 | Complete command passes | Local portable run completed without failures | Proven. |

## Verification

The complete `npm run ci` lane passed locally on 2026-07-12:

- formatting and linting passed;
- JavaScript static analysis passed;
- 207/207 Node tests passed;
- the Vite production build passed; and
- 81/81 portable browser tests passed across Chromium, Firefox, and WebKit,
  with the three GPU-only cases skipped as designed.

`git diff --check` also passes. The headed Chromium WebGPU test remains a
separate local capability gate because success on a generic hosted runner would
not establish a real GPU path.

## Decision

Phase 5H is complete as a narrow reproducibility increment. It changes no
runtime API and makes no claim about public publication, artifact authenticity,
physical devices, or operated services.
