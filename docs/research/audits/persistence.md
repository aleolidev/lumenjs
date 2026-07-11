# Persistence audit

Audit date: 2026-07-11.

## Assignment

| Need | Primary | Secondary | Decision |
| --- | --- | --- | --- |
| Structured local saves | IndexedDB + [idb](https://github.com/jakearchibald/idb) | Native IndexedDB | Dependency candidate validated by spike. |
| Large binary local data | OPFS | IndexedDB blobs | Optional backend, not baseline. |
| Portable backup | File input + Blob download | File System Access API | Universal baseline plus optional enhanced UX. |
| Writer coordination | Web Locks + IDB transactions | BroadcastChannel | Use where multi-tab semantics require it. |
| Cloud saves | External service/module | None | Explicitly outside core. |

Scores for current fit: `idb` 9.2/10; native IndexedDB 8.6; Dexie 7.7;
OPFS 7.2 general and 9 for large blobs; File System Access 8.8 as optional UX;
`localStorage` 2.

## Save requirements

- Keep physical database version, save-format version, and game/rules version
  separate.
- Write snapshot records and their current pointer in one read-write transaction
  and await commit.
- Store append-only generations with parent, checksum, and format metadata;
  retain previous valid generations.
- Use default/relaxed durability for frequent autosaves and request strict
  durability for important checkpoints when supported.
- Validate and checksum before opening a transaction; avoid unrelated awaits
  while a transaction is live.
- Recover from logical corruption by walking previous generations.
- Treat quota, eviction, private browsing, origin changes, and user deletion as
  normal failure modes.
- Autosave during gameplay; never depend on `unload` or `beforeunload`.
- Export portable backups before destructive migration and at user-visible
  milestones.

## Migration requirements

- Pure incremental transformations over a copied snapshot.
- Validation before and after migration.
- Historical fixtures for every supported version and every supported jump.
- Tests for interruption, newer unknown versions, fallback, and rollback.
- Never delete the last known-good save before the replacement commits.
- Reject downgrade unless an explicit inverse migration exists.

## Cloud boundary

Cloud synchronization consumes portable snapshots and revision IDs. It owns
authentication, encryption/privacy, quotas, retries, account deletion, protocol
versions, and conflict handling. Initial conflict policy should preserve both
branches rather than silently use last-write-wins.

## Evidence

- [IndexedDB specification](https://w3c.github.io/IndexedDB/)
- [MDN IndexedDB terminology](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology)
- [MDN storage quota and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Storage persistence](https://developer.mozilla.org/docs/Web/API/StorageManager/persist)
- [OPFS](https://web.dev/articles/origin-private-file-system)
- [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [`idb`](https://github.com/jakearchibald/idb), ISC license

## Verified spike

`idb` 8.0.3 passed Chromium, Firefox, and WebKit tests for an atomic multi-store
snapshot/pointer commit, strict-durability feature use, checksum validation,
fallback to a previous generation, and storage quota/persistence diagnostics.

Still unverified: blocked upgrades across tabs, Web Locks, quota exhaustion,
large payload latency, migration interruption, private-mode lifetime, and real
mobile eviction.
