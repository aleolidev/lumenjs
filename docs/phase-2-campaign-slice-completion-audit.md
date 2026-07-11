# Phase 2 campaign-slice completion audit

Audit date: 2026-07-11.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Validate all campaign sources before state | Campaign schema/importer and Node tests | Proven. |
| Source-linked broken references | Broken dialogue and move fixtures | Proven. |
| Validated companion choice | Dialogue simulation and browser flow | Proven. |
| Moves, item, speed, win, loss, recruitment | Battle simulation and Node tests | Proven. |
| Explain state changes with facts | Replay assertions and battle UI | Proven. |
| Reproduce campaign hashes and facts | Victory/loss replays and deterministic tests | Proven. |
| Reflect the result in the world | Result continuation and message state | Proven. |
| Preserve Classic/Enhanced semantics | Existing invariance browser test | Proven. |
| Browser-free rule coverage | Node test suite | Proven. |
| Chromium, Firefox, WebKit flow | Portable Playwright suite | Proven. |
| Preserve real WebGPU world rendering | Headed GPU acceptance lane | Proven. |
| Original content and provenance | `first-light-provenance.md` | Proven. |
| Boundary retrospective | Phase 2 retrospective | Proven. |

## Scope confirmation

This slice does not claim generational saves, import/export, audio, remapping,
touch/gamepad parity, localization, type charts, status effects, experience,
levels, switching, procedural encounters, quests, online play, a general event
language, or public module contracts.
