# Phase 5K exact package-allowlist specification

Status: authorized on 2026-07-12 from private-package drift review.

## Observed gap

The private candidate had a measured 19-file boundary, but its `files` field
used source-directory globs. A later internal implementation file could enter a
consumer tarball without an intentional package-boundary change.

## Acceptance criteria

1. The package lists every shipped CLI source and runtime resource explicitly.
2. The allowlist equals the executable's local static-import closure plus
   explicitly identified dynamic runtime resources and the third-party notice.
3. A new internal source does not ship by default.
4. The measured tarball changes only when the executable closure changes
   intentionally.
5. Executable mode, private state, dependency closure, and clean workflow remain
   unchanged.
6. This does not authorize publication or public entry points.
7. an automated npm dry run asserts the complete effective inventory, including
   npm's mandatory package metadata/README additions, so manifest and packer
   behavior cannot drift from the measured 20-entry boundary silently.
