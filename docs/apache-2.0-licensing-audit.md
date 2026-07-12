# Apache-2.0 licensing audit

Audit date: 2026-07-12.

The project owner selected Apache License 2.0 for LumenJS. The unmodified
canonical license text is stored at repository root and the npm manifest and
lock root declare SPDX identifier `Apache-2.0`.

## Repository content review

- First Light, Willowbound, Tideglass Reach, their prose, identifiers,
  placeholder geometry, and production visual assets are recorded as original
  LumenJS material in their provenance documents.
- Test-only negative fixtures and historical migrations are excluded from the
  npm tarball and production Vite asset directory where documented.
- Research documents cite external specifications and projects as references;
  they do not vendor those projects' source or protected game content.
- The npm tarball carries only the CLI closure, `LICENSE`, README, package
  metadata, and `THIRD_PARTY_NOTICES.md`.
- Ajv is the only direct production dependency. Ajv and its transitive packages
  retain their own license metadata and upstream license files; the exact
  installed inventory is recorded in the Phase 5F audit.
- No LumenJS `NOTICE` file is required by current project-owned content because
  no mandatory Apache NOTICE attributions have been incorporated. This does not
  replace the third-party notices or upstream license texts.

## Boundary

Apache-2.0 covers LumenJS project-owned source and documentation. It does not
relicense dependencies, external references, trademarks, or future creator
content. Contributors must have the right to submit their work; accepting a
contribution does not establish a separate compatibility or support promise.

The automated distribution tests prove that the canonical license and metadata
travel with the tarball. This is a repository compliance review, not legal
advice or a jurisdiction-specific opinion.
