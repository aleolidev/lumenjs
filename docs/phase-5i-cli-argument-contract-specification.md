# Phase 5I CLI argument-contract specification

Status: authorized on 2026-07-12 from clean-package boundary review.

## Observed gap

The experimental CLI accepted unknown options silently, and an option token
could be consumed as the value of another option. A typo could therefore appear
to succeed or select an unintended output path.

## Acceptance criteria

1. Every documented command rejects options outside its own option set.
2. Options requiring values reject absent values and following option tokens.
3. Duplicate options are rejected instead of using an implicit winner.
   Restore generation values use canonical positive safe-integer decimal syntax
   rather than JavaScript numeric coercion.
4. Argument-contract failures write one stable message and exit with usage code 2.
5. Existing valid commands and JSON result behavior remain unchanged.
6. The installed private tarball proves both the normal workflow and rejection.
7. Command-level required options match the documented grammar; specifically,
   CLI `focus` requires `--map <id>` even though the internal focus API may use
   the validated project start map as its default.
8. Human terminal output escapes Unicode control/format/line-separator input
   originating in commands, options, paths, errors, or diagnostics; JSON mode
   retains ordinary JSON escaping and valid project Unicode remains unchanged.

This remains an experimental private CLI contract, not a public compatibility
or semantic-versioning promise.
