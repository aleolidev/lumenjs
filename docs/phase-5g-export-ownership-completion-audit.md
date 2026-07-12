# Phase 5G export-destination ownership completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Missing/empty destinations | Existing export matrix | Proven. |
| 2 | Valid owned replacement | Repeated byte-deterministic export | Proven. |
| 3 | Forged marker refusal | Marker-only byte-preservation test | Proven. |
| 4 | Corrupt export refusal | Changed-file byte-preservation test | Proven. |
| 5 | Symlink destination refusal | Valid external target remains exact | Proven. |
| 6 | Shared ownership rules | Exporter calls `verifyCreatorExport` | Proven. |
| 7 | Pre-commit rollback/inherited gates | Injected failure after backup rename restores the exact verified destination and leaves no staging/backup residue; final Node/browser/GPU/build baseline | Proven. |
| 8 | Same-project replacement only | Different valid project preserved byte-for-byte | Proven. |
| 9 | Canonical destination reservation | A lock placed at the physical destination blocks export through a parent symlink alias before output creation | Proven. |
| 10 | Canonical manifest file paths | Received-export mutation rejects a trailing-slash directory-shaped declaration with `CREATOR_EXPORT_VERIFY_PATH_UNSAFE`; path validation excludes empty, dot, parent, and reserved segments | Proven. |
| 11 | Control-free received paths | ESC-bearing manifest and physical-file mutations fail with `CREATOR_EXPORT_VERIFY_PATH_UNSAFE` without echoing the unsafe value | Proven. |
| 12 | Cross-platform received paths | Device-reserved, case-alias, and marker-case-alias manifest mutations fail on Unix; one shared tracker also rejects case-colliding walked entries | Proven. |
| 13 | Post-commit cleanup semantics | Injected old-backup cleanup failure returns `deferred`, leaves the new export verified, and retains one independently verified old backup | Proven. |
| 14 | Recovery-state exclusion | Received-manifest `.LUMEN/backups/...` mutation fails as an unsafe path before inventory traversal | Proven. |

## Additional finding

The audit also exposed that the previous “unowned destination” test corrupted
the source project first, so validation failed before destination ownership was
examined. The test now uses a valid source and proves the actual refusal path.

## Scope confirmation

Ownership means a complete, integrity-valid experimental Lumen static export.
It does not establish publisher authenticity. The check reduces accidental
replacement risk but is not a filesystem transaction primitive against a
hostile process racing the same destination.

A later identity audit tightened “owned” to “owned by this project.” A valid
Lumen export is no longer sufficient to replace another project's deployment.
