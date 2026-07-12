# Phase 2 campaign-slice completion audit

Audit date: 2026-07-12 re-audit; original acceptance 2026-07-11.

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Validate all campaign sources before state | Presence-aware campaign schema/importer plus falsy roots, identity, distinct encounter, starter ownership, effect, reachability, and termination tests | Proven. |
| 2 | Source-linked broken references | Broken dialogue and move fixtures | Proven. |
| 3 | Validated companion choice | Reachable choices target declared starters, every starter is selectable from `dialogue.start`, plus simulation/browser flow | Proven. |
| 4 | Moves, item, speed, win, loss, recruitment | Battle simulation and Node tests | Proven. |
| 5 | Explain state changes with facts | Replay assertions and battle UI | Proven. |
| 6 | Reproduce campaign hashes and facts | Victory/loss replays and deterministic tests | Proven. |
| 7 | Reflect the result in the world | Result continuation and message state | Proven. |
| 8 | Preserve Classic/Enhanced semantics | Existing invariance browser test | Proven. |
| 9 | Browser-free rule coverage | Node test suite | Proven. |
| 10 | Chromium, Firefox, WebKit flow | Portable Playwright suite | Proven. |
| 11 | Preserve real WebGPU world rendering | Headed GPU acceptance lane | Proven. |
| 12 | Original content and provenance | `first-light-provenance.md` | Proven. |
| 13 | Boundary retrospective | Phase 2 retrospective | Proven. |

## Scope confirmation

This slice does not claim generational saves, import/export, audio, remapping,
touch/gamepad parity, localization, type charts, status effects, experience,
levels, switching, procedural encounters, quests, online play, a general event
language, or public module contracts.

The current whole-repository verification baseline is maintained in
`phase-5-distribution-progress-audit.md`; this audit preserves the original
slice decision and now maps its acceptance criteria explicitly.
