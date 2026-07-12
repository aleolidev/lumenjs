# Phase 5E compatibility visibility specification

Status: authorized on 2026-07-12 from the Phase 5 format inventory.

## Product question

Can a creator see exactly which experimental source versions a validated
project uses, without mistaking current support for a long-lived promise?

## Increment

Extend deterministic `lumen inspect` output with a compatibility block that
records:

- policy/status (`experimental-no-compatibility-promise`);
- creator manifest schema version;
- every Tiled map source and declared Tiled/JSON version;
- every Lumen world source and schema version;
- campaign source and schema version;
- locale catalog IDs and their unversioned status; and
- every context contribution declaration/source format/version/optionality.

Human output displays the experimental policy. JSON retains the detailed sorted
record. Invalid/unsupported inputs continue to fail validation before inspection.

## Acceptance criteria

1. Willowbound inspection reports every declared source version deterministically.
2. Compatibility arrays follow manifest order where behavior depends on it and
   otherwise use stable ordering.
3. Optional context absence remains visible as `present: false`.
4. Human output cannot be read as a stability promise.
5. Unsupported schema/module versions still fail with coded diagnostics.
6. No migration, semver support window, or cross-version compatibility is
   invented.
7. Existing verification gates pass.
