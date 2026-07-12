# Phase 5F package dependency-provenance specification

Status: authorized on 2026-07-12 from the private tarball audit.

## Increment

Ship a concise third-party notice in the private candidate tarball for every
direct production dependency. Assert that name, exact direct version, SPDX
license declaration, and upstream are present. Record the resolved transitive
snapshot in the completion audit, while recognizing that npm consumers install
transitives according to dependency ranges rather than this repository lockfile.

## Acceptance criteria

1. Every direct production dependency has one notice entry.
2. Notice version matches `package.json` exactly.
3. Notice license matches installed package metadata and lockfile metadata.
4. Notice distinguishes direct inventory from transitive installed packages.
5. Candidate tarball includes the notice.
6. The notice does not claim to replace dependency license texts.
7. LumenJS's own absent license remains an explicit publication blocker.
8. Existing gates pass.
