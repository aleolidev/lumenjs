# Phase 5A received-export verification specification

Status: authorized from the Phase 5 local artifact audit on 2026-07-12.

## Command

```text
lumen verify-export <directory> [--json]
```

The command reads `lumen-export-manifest.json`, validates the experimental
format and metadata, rejects unsafe or duplicate-equivalent paths, walks the
bundle without following symlinks, requires an exact declared-file inventory,
and verifies every `sha256-v1` digest. It changes no byte.

This proves integrity relative to the received manifest. Because the manifest
is unsigned, it does not prove publisher identity, origin, or authenticity.

## Acceptance criteria

1. A fresh Willowbound export verifies in human and JSON CLI modes.
2. Verification returns project ID/version, sorted files, and their hashes.
3. Invalid JSON/format/metadata/hash declarations fail with stable codes.
4. Unsafe paths, including hidden dot-prefixed segments and URL fragment/escape
   delimiters `#`/`%`, and any symlink in the bundle fail before hashing
   targets.
5. Missing, unexpected, and byte-modified files fail distinctly.
6. Verification performs no writes and is deterministic.
7. Existing Node/browser/GPU/build gates remain green.
8. Manifest and command remain experimental and make no authenticity claim.
9. The directory tree is exact as well as the file list: only parent
   directories implied by declared file paths may exist.
