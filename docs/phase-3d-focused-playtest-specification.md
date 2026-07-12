# Phase 3D focused-playtest specification

Status: authorized for experimental implementation on 2026-07-12.

## Product question

Can a creator enter a deterministic Willowbound map/spawn/locale directly,
inspect state/facts, and exercise transitions and character messages without
editing runtime code?

## Boundary

A browser-free experimental simulation consumes already validated creator
documents. It supports bounded grid movement, collision objects, cross-map
transitions, faced-character interaction, localized messages, deterministic
state, and structured facts. It does not reuse or replace First Light's runtime.

The CLI adds:

```text
lumen focus <directory> --map <id> [--spawn <id>] [--locale <id>] [--json]
```

It validates and returns a deterministic focus descriptor and initial state.
It does not start a server or mutate the project.

Static export includes a small experimental browser playtest. Query parameters
`map`, `spawn`, and `locale` select the entry point. Keyboard/buttons dispatch
only simulation actions. The page displays active map, player, recent facts,
and validation/focus errors accessibly.

## Acceptance criteria

1. Valid map/spawn/locale focus produces a deterministic initial state.
2. Unknown focus references fail before state with coded diagnostics.
3. Movement, bounds, collisions, character interaction, localization, and both
   transition directions have fixed state/fact tests.
4. Focus never mutates creator documents.
5. CLI human/JSON output and exit codes are deterministic.
6. Static export hashes and includes only the declared project plus required
   experimental playtest modules; authored titles are HTML-escaped before they
   enter the generated document.
7. Chromium, Firefox, and WebKit load a focused Spanish playtest, interact, and
   cross maps without console errors.
8. Narrow viewport controls and live diagnostics remain usable.
9. Existing Phase 2B and Phase 3 gates remain green.
10. The focused simulation/export remains experimental and is not the first
    public runtime/editor module pair.
11. Focused controls own native Space activation exactly once, editable/select
    and IME input stay outside global gameplay dispatch, and unfocused movement
    keys keep their existing action boundary.
12. The validated focused locale sets both localized message language and the
    document's root `lang` attribute.
13. map, spawn, locale, and transition-target lookup requires an own validated
    dictionary entry; inherited object-property names fail before focused state.

## Deferred

Dialogue choices, battles, quests, trainer runtime, animation, WebGPU reuse,
assets, save integration, dev-server management, hot reload, visual editing,
and public module contracts remain deferred.
