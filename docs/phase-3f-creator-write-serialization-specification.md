# Phase 3F creator-write serialization specification

Status: authorized on 2026-07-12 from concurrent mutation review.

## Observed gap

Backup generation reservations prevented generation-number collisions, but two
`rename --apply` operations could still validate the same pre-image and commit
source files concurrently. Restore apply was not coordinated with rename apply,
and rename temporaries were only unique by process ID.

## Acceptance criteria

1. Preview-only rename and restore remain inert and need no write reservation.
2. Every rename apply holds one project reservation from validation through
   backup, commit, final validation, and rollback.
3. Every restore apply uses that same reservation for its complete transaction.
4. A concurrent writer fails with stable code `CREATOR_WRITE_BUSY` before
   validation or mutation.
5. Competing rename applies leave one valid result, one complete backup, and no
   lock residue.
6. A blocked restore leaves current sources and backup inventory unchanged.
7. Export holds a shared read reservation while validating and copying its
   source snapshot. Multiple exports may read concurrently, while an active
   mutation excludes readers and writers.
8. Final-component symlink project roots are rejected by validation, while
   filesystem aliases in parent components canonicalize to the same physical
   reservation path, so one project cannot obtain multiple reservations.
9. The reservation coordinates normal tool processes; hostile filesystem races
   and automatic abandoned-lock recovery remain outside the claim.
10. Rename commit temporaries use unguessable per-file names and cleanup tracks
    those exact paths; exclusive creation prevents any collision from becoming
    a commit target.
