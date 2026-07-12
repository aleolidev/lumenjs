# Phase 5M export project-identity completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Verified ownership retained | Destination inspection still calls verifier | Proven. |
| 2 | Same project required | Verified ID compared before staging | Proven. |
| 3 | Specific failure | `CREATOR_EXPORT_DESTINATION_PROJECT_MISMATCH` | Proven. |
| 4 | Different project preserved | Full directory bytes and post-refusal verification | Proven. |
| 5 | Existing destinations retained | Export regression matrix | Proven. |
| 6 | No authenticity claim | Scope record | Proven. |
| 7 | Concurrent identity safety | Atomic destination reservation and two-project race | Proven. |

## Verification

`npm run check` passes formatting, types, and 113/113 Node tests. The identity case
exports an independently scaffolded project, attempts to replace it with
Willowbound, verifies the coded refusal, compares every byte, and then verifies
that the destination still identifies the original project.

A second case starts two different projects against one missing destination.
Exactly one succeeds; the other reports a busy or post-reservation identity
failure, the winning export verifies, and the reservation is removed.

## Decision

Phase 5M is complete. The project ID is a local replacement-safety boundary,
not proof of publisher identity or artifact authenticity.
The reservation coordinates ordinary tool invocations; it is not a hostile
filesystem transaction or automatic stale-lock recovery mechanism.
