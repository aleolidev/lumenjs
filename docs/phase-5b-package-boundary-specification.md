# Phase 5B private package-boundary specification

Historical note: this specification records the earlier private `0.0.0` gate.
Apache-2.0 and the unpublished public `0.1.0` candidate supersede that state;
see `public-experimental-release-readiness.md`.

Status: authorized by the `npm pack --dry-run --json` audit on 2026-07-12.

## Observed failure

Without an explicit package boundary, npm selected 155 entries (6,026,861
packed bytes), including art sources, browser fixtures, tests, spikes, research,
agent notes, and repository configuration. That is not a credible consumer
artifact.

## Narrow boundary

Keep `private: true`, version `0.0.0`, and no `exports` map. The only current
consumer product is the experimental `lumen` CLI, so the candidate tarball may
contain:

- `package.json` and npm's automatic README inclusion;
- `bin/lumen.js`;
- production `src/creator/*.js`, excluding tests; and
- production `src/modules/*.js` required by creator export/focus; and
- `src/project/schemas.js`, the creator validator's only project-layer import.

Do not include First Light, images, examples, tests, spikes, docs, repository
automation, or development configuration. Do not select a license, public name,
release version, module exports, or publication channel in this increment.

## Acceptance criteria

1. `npm pack --dry-run --json` contains only the narrow candidate boundary.
2. The executable bit and `bin.lumen` mapping remain intact.
3. Installed production dependencies cover the CLI (`ajv` only).
4. Package remains private, `0.0.0`, and exposes no library entry points.
5. Package inventory is recorded and asserted without publishing.
6. Existing verification gates remain green.
7. Publication remains blocked until a project license and release policy are
   deliberately selected.
8. The lockfile root entry exactly matches package name/version, production and
   development dependency maps, and engine requirement; metadata drift fails
   before clean install or packing evidence is accepted.
