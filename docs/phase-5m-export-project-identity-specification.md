# Phase 5M export project-identity specification

Status: authorized on 2026-07-12 from replacement-safety review.

## Observed gap

Phase 5G required a complete verified destination before replacement, but any
valid Lumen export qualified. A creator could accidentally export one project
over another project's valid deployment.

## Acceptance criteria

1. Replacement requires a complete verified destination as before.
2. Its recorded project ID must equal the validated source project's ID.
3. A valid different-project destination fails with a specific coded error.
4. Refusal preserves every destination byte and its verified identity.
5. Missing and empty targets, and repeat exports of the same project, remain
   supported.
6. Identity equality is not an authenticity or publisher-identity claim.
7. Concurrent cooperative exports reserve the destination before inspection, so
   two different projects cannot both observe an unowned missing target.
