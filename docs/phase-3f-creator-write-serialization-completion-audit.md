# Phase 3F creator-write serialization completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Previews remain lock-free | Apply-only wrapper paths | Proven. |
| 2 | Rename transaction reserved | Shared wrapper encloses unlocked operation | Proven. |
| 3 | Restore shares reservation | Shared wrapper and explicit busy test | Proven. |
| 4 | Stable busy failure | `CreatorWriteLockError` with `CREATOR_WRITE_BUSY` | Proven. |
| 5 | Concurrent rename safety | Two-target race, validation, backup and residue assertions | Proven. |
| 6 | Blocked restore inert | Source-byte and generation-count assertions | Proven. |
| 7 | Export source snapshot | Reader/writer tests and three-worker browser export | Proven. |
| 8 | Single physical root identity | Symlink-root rejection plus canonical alias lock-conflict test | Proven. |
| 9 | Narrow concurrency claim | Specification boundary | Proven. |
| 10 | Unique rename temporaries | Per-file UUID path list and rollback cleanup | Proven. |

## Verification

The full Node suite passes 122/122 tests after adding the concurrency cases. One
competing rename succeeds and one fails busy; the project validates,
exactly one backup exists, and the reservation is removed. Restore apply against
an existing reservation fails before mutation and leaves both sources and
backup inventory unchanged.
Export uses a shared reader reservation: two distinct outputs can copy the same
source concurrently, while an active writer causes export to fail before
destination creation. The three Playwright workers also complete their
same-source exports in the 18/18 creator-browser matrix.
Validation rejects a final-component symlinked project root before reading its
manifest. The lock layer additionally resolves an existing root to its physical
path, so parent-component aliases and direct paths conflict on the same sibling
reservation rather than acquiring independent locks.
The freshly installed private tarball also completed rename apply, verified
backup listing, restore apply, nested export, and export verification with the
shared lock module present in the exact package closure.

## Decision

Phase 3F is complete as creator-safety hardening. The sibling directory
reservation is intentionally simple and visible. A lock left by an abrupt
process or machine failure requires deliberate inspection/removal; the tool
does not guess that an unknown lock is stale. Recovery inspection covers the
exact write lock, UUID read locks, and the bounded-acquisition gate documented
in the README; none is hidden behind a partial glob.
