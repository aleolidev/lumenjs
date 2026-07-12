# Phase 5H portable CI specification

Status: authorized on 2026-07-12 from delivery-gate comparison.

## Observed gap

Every completion audit treated the Vite production build as required evidence,
but `npm run ci` and GitHub Actions only ran formatting, types, Node tests, and
the browser matrix. A build regression could therefore merge while the
documented gate remained manual.

## Acceptance criteria

1. `npm run ci` runs check, production build, then portable browser tests.
2. GitHub Actions continues to invoke the single documented CI command.
3. Headed WebGPU remains separate from generic hosted runners.
4. Package publication, signatures, real devices, and credentials are not added.
5. Development documentation matches Ajv's production CLI role and the current
   experimental source boundaries.
6. The complete portable CI command passes locally.
