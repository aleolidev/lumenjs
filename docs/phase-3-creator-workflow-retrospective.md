# Phase 3 creator-workflow retrospective

Date: 2026-07-12.

## Outcome

Phase 3 turns the repository from a single fixture into a creator-observable
workflow. A clean-room creator can scaffold Willowbound, validate and inspect
its two maps, author creatures/dialogue/encounters/trainers/quest-like goals,
localize messages, preview and safely apply cross-file renames, focus a
deterministic playtest, and produce a reproducible static export without editing
`src` or copying First Light.

The first evidence-based runtime/editor pair is deliberately experimental:

- `playtest-simulation.js` consumes validated creator documents and owns state,
  actions, localization, transitions, facts, and hashes; and
- `playtest-browser.js` adapts keyboard/buttons and renders state/facts without
  duplicating rules.

The CLI focus path and browser export exercise the same map/spawn/locale model.
The pair exists because the clean-room trial measured focused-entry friction and
because its movement/interaction boundary matches evidence already seen in
First Light. It is not a public module contract and does not replace First
Light's richer runtime.

## Boundaries to keep

- Manifest-driven source discovery with root/symlink safety.
- Structural validation before semantic resolution and state creation.
- Coded diagnostics with source, pointer, value, related target, and remedy.
- Deterministic scaffolds, inspection, focus state, backups, and exports.
- Preview and staged validation before creator-source transformations.
- Project-owned locale catalogs and message keys in authored records.
- External Tiled geometry plus Lumen-owned gameplay meaning.
- UI adapters that consume simulation facts rather than recreate rules.

## Boundaries to revisit

- The creator schema and First Light schema remain intentionally separate. A
  third campaign must determine whether and how they converge.
- Backup list/restore now verifies integrity and creates a safety generation;
  disaster recovery from an already-invalid current project still needs evidence.
- Focused playtest lacks dialogue choices, battles, quest state, trainer runtime,
  assets, saves, and WebGPU presentation.
- Static export hosts the experimental grid playtest, not the polished First
  Light renderer.
- Locale catalogs do not yet cover fallback, plural rules, or runtime switching.
- Safe rename supports logical IDs but not Tiled object names or filenames.

## Boundaries to avoid

- Do not call experimental schemas, diagnostics, CLI JSON, backup layout,
  export layout, or focused simulation public APIs.
- Do not replace Tiled or build a map editor without contrary workflow evidence.
- Do not generalize the narrow quest start/completion pair into an event language.
- Do not merge First Light and Willowbound by adding fixture-name branches.
- Do not split packages until a proven module boundary needs independent use.

## Next product decision

Phase 4 must begin with distinct advanced campaign needs, not with abstraction.
Research contextual battlefields, open-world scaling, challenge overlays, and
compositional creatures as separate consumers. Settle a reusable module only
when at least two needs demand the same ownership and replacement boundary.
