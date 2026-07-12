# Phase 3A creator-foundation completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Original scaffold without First Light | Template module and forbidden-name test | Proven. |
| 2 | Byte-identical repeated creation | Two-directory content comparison | Proven. |
| 3 | Non-empty target unchanged | Before/after refusal test | Proven. |
| 4 | Manifest-driven discovery | Validator and Willowbound inspection | Proven. |
| 5 | Coded failure classes | JSON/file/schema/ID/Tiled/reference/path tests, including malformed/out-of-bounds objects and spawns inside collision | Proven. |
| 6 | Source, exact pointer, message, remedy | Diagnostic field assertions plus missing `schemaVersion` and additional `a/b~` mutations yielding `/schemaVersion` and `/a~1b~0` | Proven. |
| 7 | Stable JSON output | CLI JSON assertions | Proven. |
| 8 | Deterministic inspection graph | Inspection snapshot assertions | Proven. |
| 9 | Invalid export is inert | Owned destination before/after assertion | Proven. |
| 10 | Declared inputs plus runtime only | Exact export file-list assertion | Proven. |
| 11 | Reproducible export hashes | Repeated manifest/content comparison | Proven. |
| 12 | Root and symlink safety | Traversal, root/input symlink, nested-output, and canonical parent-symlink re-entry tests | Proven. |
| 13 | Clean-room end-to-end fixture | `examples/willowbound` CLI run plus generated/example exact inventory, semantic JSON/TMJ equality, and byte equality for non-JSON documents | Proven. |
| 14 | Module and process-wrapper tests | Creator Node suite | Proven. |
| 15 | Preserve earlier gates | Full verification record below | Proven. |
| 16 | Experimental contracts disclosed | README and specification | Proven. |
| 17 | Concurrent and target-safe creation | UUID staging race and symlink-target tests | Proven. |
| 18 | Local recovery ignored by Git | Deterministic `.gitignore` and exact export inventory | Proven. |
| 19 | Reserved title-derived IDs | Constructor/Prototype scaffolds receive safe IDs and validate | Proven. |
| 20 | Visible normalized title | Scaffold and manifest schema use Unicode `Bidi_Control` and require visible content without controls, separators, or unsafe invisible formats; Arabic Letter Mark fails while a ZWJ emoji title scaffolds and validates | Proven. |
| 21 | Dialogue graph semantics | Duplicate choice, effect conflict, disconnected node, and trapped-cycle diagnostics | Proven. |
| 22 | Locale-independent ordering | Production sort sites use binary string comparison; fixture snapshots remain stable | Proven. |
| 23 | JSON presence/value distinction | Null manifest and null present optional-context fixtures produce coded schema diagnostics | Proven. |
| 24 | Character localization references | Missing character message keys produce coded diagnostics with both catalog-backed and inline campaign messages | Proven. |
| 25 | Stable inline message IDs | Campaign schema `propertyNames` and reserved-key mutation test reject inherited-object names | Proven. |
| 26 | Unique creature move slots | Campaign schema `uniqueItems` and duplicate-slot mutation test reject ambiguous move lists | Proven. |
| 27 | Reachable spawn/transition cells | Coded mutation matrix rejects spawn/transition collision and both spawn/transition character overlap before focused state | Proven. |
| 28 | Stable inventory keys | Campaign schema `propertyNames` accepts the encounter-context key grammar while a coded reserved-key mutation rejects `constructor` | Proven. |
| 29 | Control-free declared paths | Manifest mutation with an ESC-bearing campaign source receives `CREATOR_PATH_UNSAFE` before file loading | Proven. |
| 30 | Terminal-safe Tiled diagnostics | ESC-bearing referenced type and duplicate-name mutations produce coded diagnostics whose human message/pointer contain no ESC | Proven. |
| 31 | Cross-platform path identity | Unix-host mutations reject hidden `.env`, drive-like `C:campaign.json`, device-reserved `assets/aux.txt`, URL delimiters `#`/`%`, decomposed Unicode, and `locales/en.json` versus `locales/EN.json` collision | Proven. |
| 32 | Unambiguous trigger cells | Coded mutations duplicate a character and transition object reference; both fail with `CREATOR_TRIGGER_CELL_AMBIGUOUS` before focused state | Proven. |
| 33 | Tool-owned path reservation | Asset mutation rejects generated-root names, case aliases, implicit project manifest, and `.lumen/backups` before file access/export | Proven. |
| 34 | Visible authoring text | World-character, dialogue-speaker, and localized-message mutations reject whitespace/zero-width-only content; a positive fixture retains emoji, accented text, and localized line breaks | Proven. |
| 35 | Empty-target rollback | Injected pre-commit failure restores the existing empty directory and leaves no create staging residue | Proven. |

## Verification record

- `npm run check`: formatting, types, and 101/101 Node tests pass.
- `npm run lumen -- validate examples/willowbound`: passes.
- `npm run lumen -- inspect examples/willowbound`: reports two maps and two
  transition edges.
- `npm run lumen -- export examples/willowbound --out <temporary>`: passes.
- `npm run test:browser`: 42/42 portable tests pass; three GPU-only tests skip.
- `npm run test:gpu`: headed Chromium passes across both First Light maps.
- `npm run build`: Vite production build passes.

## Scope confirmation

Later concurrency hardening replaced PID-shared create staging with a UUID per
attempt. Two simultaneous creates now leave one valid project and no staging
residue; a symlink target is refused without touching its directory.

Phase 3A does not make the standard preset, schemas, CLI JSON, diagnostics, or
export layout a public compatibility contract. It does not add a visual editor,
focused runtime starts, source refactors, localization catalogs, quests,
trainers, module pairs, package splits, or Tiled replacement.
