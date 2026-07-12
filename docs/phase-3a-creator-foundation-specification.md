# Phase 3A creator-foundation specification

Status: authorized for implementation on 2026-07-12 from the Phase 3 workflow
trials. This increment is creator tooling, not a public runtime API.

## Product question

Can a new creator start, validate, diagnose, and export a small original LumenJS
project without copying First Light or editing engine internals?

## Scope

Phase 3A adds one small Node CLI with four commands:

```text
lumen create <directory> [--name <title>]
lumen validate <directory> [--json]
lumen inspect <directory> [--json]
lumen export <directory> --out <directory>
```

The implementation remains in this single package. It uses Node and existing
dependencies, keeps project data as readable JSON/TMJ, and does not require a
runtime framework.

## Clean-room fixture

The acceptance fixture is an original project distinct from First Light. It
contains two small maps, transitions in both directions, a character, one
encounter, three original creatures, original prose, a provenance record, and
no copied First Light IDs or story content.

The fixture exists to exercise creator workflow and reveal shared boundaries.
It does not need a second polished WebGPU presentation in this increment.

## Scaffold

`create` writes a complete, conservative project directory only when the target
does not exist or is empty. It derives a stable project ID from the supplied
title, writes two valid Tiled JSON placeholders plus Lumen-owned metadata and
campaign data, and includes a README and provenance stub.

The scaffold must pass `validate` immediately. Re-running against a non-empty
target fails without changing any file. Template timestamps are forbidden so
the same title produces byte-identical output.

The standard preset is explicitly a starter template. Its data shapes are not
declared universal or public.

## Validation and diagnostics

`validate` loads only files declared by the project manifest. It rejects unsafe
paths, missing files, invalid JSON, structural failures, duplicate IDs/objects,
wrong Tiled object types, and missing cross-file references before returning a
resolved project summary.

Every diagnostic has:

- stable tool-owned code;
- severity;
- source path relative to the project;
- exact RFC 6901 JSON pointer, including the required or additional field named
  by structural-schema diagnostics;
- offending value when available;
- concise message and remedy; and
- related source/pointer when another document owns the expected target.

Human output is concise. `--json` emits one JSON document and no decorative
text. Validation exits zero only when no error diagnostic exists.

## Inspect

`inspect` first validates, then reports project ID/version, declared files, map
IDs and dimensions, spawn/transition graph, creature/dialogue/encounter counts,
and provenance presence. It does not initialize simulation or mutate sources.

## Static export

`export` validates first and fails without touching the destination on invalid
input. It stages a new directory, copies only manifest-declared creator files
and assets plus the minimum existing LumenJS web runtime required to host the
project, writes a deterministic export manifest with SHA-256 hashes, then
atomically replaces an absent or tool-owned destination.

An unrelated non-empty destination is never overwritten. Source paths cannot
escape the project root, and symlinks are rejected in the baseline.

Output must be byte-reproducible for unchanged inputs. The export manifest must
not contain a wall-clock timestamp.

## CLI boundary

Argument parsing, filesystem orchestration, templates, validation, inspection,
and export are separate modules with unidirectional dependencies. Commands may
use the modules; modules never import the CLI process wrapper.

Errors are returned as data below the process wrapper. Tests call modules
directly where possible and spawn the CLI only for exit/stdout/stderr behavior.

## Acceptance criteria

Phase 3A is complete only when:

1. `create` produces a complete original project without reading First Light;
2. repeated creation with the same title is byte-identical;
3. a non-empty target is unchanged after refused creation;
4. validation discovers files from the manifest rather than fixed filenames;
5. unsafe paths, invalid JSON, missing files, schema failures, duplicate IDs,
   wrong object types, and broken cross-map references have coded diagnostics;
6. every error has source, pointer, message, and remedy;
7. JSON output is stable and suitable for editor/tool consumption;
8. inspect reports a deterministic project and reference-graph summary;
9. invalid export changes neither source nor destination;
10. valid export contains only declared inputs and required runtime files;
11. two exports of unchanged input have identical file hashes;
12. output paths and symlinks, including symbolic-link parent components, cannot
    escape their authorized roots or resolve an apparently external export back
    inside the source project;
13. the clean-room fixture passes create→validate→inspect→export without `src`
    edits or First Light source access;
14. Node tests cover modules and CLI failure/exit behavior;
15. the existing Phase 2B Node, browser, WebGPU, and production build gates
    remain green; and
16. documentation states that preset, schemas, CLI JSON, and export layout are
    experimental and not public compatibility contracts.
17. concurrent creation uses isolated staging, leaves one complete valid
    project, and refuses symlink/non-directory targets before writes.
18. scaffolded projects ignore local recovery/temporary artifacts without
    treating `.gitignore` as a game source or static-export input.
19. title-derived project IDs cannot land on a schema-reserved object-property
    name; every accepted title still scaffolds a project that validates.
20. creator titles are trimmed, must contain visible characters, and cannot
    contain Unicode controls, line/paragraph separators, or unsafe invisible/bidirectional format characters; invalid titles fail before
    creating the target or any staging directory, and existing manifests use
    the same title contract.
21. dialogue choices are unique per node, `close-dialogue` owns no contradictory
    fields, every node is reachable from the declared start, and every reachable
    node can reach a closing choice.
22. diagnostic, inspection, rename-preview, and received-export traversal order
    uses locale-independent string comparison so stable JSON does not depend on
    host ICU/locale settings.
23. JSON parse failure, valid JSON with a falsy root, and an absent optional
    source are distinct states; present falsy documents receive schema errors
    and can never masquerade as missing optional modules or a valid project.
24. every world-character `messageKey` resolves against the same active message
    namespace as dialogue and quest text, whether that namespace is an inline
    campaign dictionary or a complete set of locale catalogs.
25. inline campaign message keys obey the same stable-ID contract as catalog
    keys and their references, including rejection of reserved inherited-object
    names before lookup tables or playtest state are built.
26. each authored creature owns a non-empty set of unique move slots; duplicate
    move IDs fail schema validation rather than creating ambiguous authored use
    counts later.
27. referenced spawns and transitions occupy cells the focused simulation can
    enter: neither collision nor a blocking character cell; invalid placements
    receive distinct coded diagnostics before playtest state.
28. authored inventory keys use the stable encounter-context key grammar,
    including useful camel-case and namespaced forms, while reserved
    inherited-object names fail schema validation before inventory state or
    lookup tables are created.
29. declared project paths contain no Unicode control, format, line-separator,
    or paragraph-separator characters; unsafe path identity fails before file
    access or terminal-facing diagnostics can reproduce injected controls.
30. creator diagnostics never interpolate free-form Tiled object names or types
    into human messages or pointers; coded/structural context remains readable,
    while JSON diagnostic values preserve the source value through escaping.
31. declared paths have one cross-platform identity contract: segments use NFC,
    reject hidden dot-prefixed segments, Windows-reserved device
    names/punctuation/trailing dot or space, and URL fragment/escape delimiters
    `#` and `%`; distinct declarations cannot collide case-insensitively,
    independent of the validator's host operating system.
32. focused-playtest characters and transitions each occupy distinct trigger
    cells; multiple authored records cannot rely on array order to decide which
    interaction or map transition fires.
33. project sources cannot occupy creator/export-owned root names (including
    case aliases) or any `.lumen` segment; generated runtime/manifest files
    cannot overwrite declared assets and recovery files cannot enter exports.
34. creator-facing names, dialogue speakers, inline messages, and locale values
    contain at least one visible Unicode letter, number, punctuation mark, or
    symbol; whitespace/invisible-only content fails schema validation, while
    useful Unicode and multiline localized prose remain valid.
35. when creation replaces a pre-existing empty target, a failure after staging
    but before the atomic commit restores that empty-directory pre-image and
    removes the exact staging directory.

## Deferred

Focused runtime entry points, visual/schema editors, safe refactor commands,
localization catalogs, quests/trainers beyond the fixture, asset processing,
dev-server orchestration, package publishing, plugin APIs, module pairs, Tiled
replacement, and long-term CLI compatibility remain outside Phase 3A.
