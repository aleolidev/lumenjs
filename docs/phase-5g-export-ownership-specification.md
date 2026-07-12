# Phase 5G export-destination ownership specification

Status: authorized on 2026-07-12 from filesystem-boundary review.

## Observed failure

The exporter previously treated any non-empty directory as Lumen-owned when its
`lumen-export-manifest.json` parsed and named the experimental format. It did
not verify manifest shape, exact inventory, file types, or hashes before
replacing the directory. A forged or corrupt marker could therefore authorize
destructive replacement of unrelated files.

## Acceptance criteria

1. Missing and genuinely empty destinations remain exportable.
2. A valid existing Lumen export remains atomically replaceable.
3. A marker-only/forged directory is unowned and byte-identical after refusal.
4. A previously valid export with changed, missing, unexpected, or symlinked
   content is unowned and remains byte-identical after refusal.
5. A symlink destination is unowned even when its target is a valid export.
6. Ownership reuses the received-export verifier rather than duplicating rules.
7. A failure after the old destination becomes a backup but before staged
   commit restores the verified destination exactly and leaves no staging or
   backup residue; inherited verification gates pass.
8. A complete valid export belonging to another project is refused without
   mutation.
9. Destination reservations key the prospective physical path, so parent-path
   aliases cannot obtain independent locks for one deployment directory.
10. received-export manifest paths describe canonical relative files, not empty,
    dot, parent, reserved, or directory-shaped segments; malformed shapes fail
    as unsafe paths before inventory traversal.
11. received-export paths reject Unicode control, format, line-separator, and
    paragraph-separator characters before filesystem traversal or diagnostic
    interpolation.
12. received manifests and physical inventories apply platform-neutral NFC,
    device-name, punctuation, trailing-dot/space, and case-insensitive collision
    rules rather than inheriting the verifier host's filesystem permissiveness.
13. once the staged export has replaced the destination, failure to remove the
    old verified backup is reported as deferred maintenance and never rolls back
    from a potentially partially deleted backup over the new valid export.
14. received exports cannot declare or contain a `.lumen` segment under any case
    alias; creator recovery state is never part of a valid static artifact.
