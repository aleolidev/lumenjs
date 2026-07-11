# Tooling audits

Audit date: 2026-07-11.

## Summary

| Candidate | Pin | Best role | Confidence | Label |
| --- | --- | --- | --- | --- |
| Tiled | [v1.12.2](https://github.com/mapeditor/tiled/releases/tag/v1.12.2) | External map editor and format reference | Medium | Primary integration reference |
| LDtk | [v1.5.3](https://github.com/deepnight/ldtk/releases/tag/v1.5.3) | Map-editor UX and typed data model | Medium | Secondary reference |
| Ajv | [v8.20.0](https://github.com/ajv-validator/ajv/releases/tag/v8.20.0) | Persistent schema validation | Medium | Dependency candidate |
| Playwright | [v1.60.0](https://github.com/microsoft/playwright/releases/tag/v1.60.0) (`87bb9dd`) | Autonomous browser QA and diagnostics | Medium | Dependency candidate |
| Vite | [v8.0.16](https://github.com/vitejs/vite/releases/tag/v8.0.16) | Development server and web build | Medium | Tooling dependency candidate |
| Yarn Spinner | `main`, exact revision pending | Dialogue compiler/VM design | Low-medium | Primary conceptual reference |

## Tiled

Evidence:

- [JSON format](https://github.com/mapeditor/tiled/blob/v1.12.2/docs/reference/json-map-format.rst)
- [scripting](https://github.com/mapeditor/tiled/tree/v1.12.2/docs/scripting)
- [tests](https://github.com/mapeditor/tiled/tree/v1.12.2/tests)
- [license boundaries](https://github.com/mapeditor/tiled/blob/v1.12.2/COPYING)

Scores: map authoring 5; JS/web integration 3; extensibility 5; verification 4;
format maturity 5; legal/operational safety 3.

The editor, `libtiled`, plugins, and formats have different license boundaries.
LumenJS should initially treat Tiled as an external application and consume an
exported format through an adapter. Project semantics require typed Lumen
schemas rather than unconstrained custom properties alone.

## LDtk

Evidence:

- [JSON Schema](https://github.com/deepnight/ldtk/blob/v1.5.3/docs/JSON_SCHEMA.json)
- [JSON documentation](https://github.com/deepnight/ldtk/blob/v1.5.3/docs/JSON_DOC.md)
- [tests](https://github.com/deepnight/ldtk/tree/v1.5.3/tests)
- [license](https://github.com/deepnight/ldtk/blob/v1.5.3/LICENSE)

Scores: map authoring 4.5; JS/web integration 3; extensibility 3; verification
3.5; format maturity 4.5; legal/operational safety 4.

LDtk is a stronger reference for compact typed entities, levels, worlds,
autolayers, IDs, and editor UX. Its opinionated 2D/grid model and slower release
cadence make it unsuitable as Lumen's canonical project model.

## Ajv

Evidence:

- [implementation](https://github.com/ajv-validator/ajv/tree/v8.20.0/lib)
- [test suite](https://github.com/ajv-validator/ajv/tree/v8.20.0/spec)
- [standalone generation](https://github.com/ajv-validator/ajv/blob/v8.20.0/docs/standalone.md)
- [security policy](https://github.com/ajv-validator/ajv/security/policy)
- [license](https://github.com/ajv-validator/ajv/blob/v8.20.0/LICENSE)

Scores: validation 5; JS/web fit 4.5; extensibility 5; verification 5; format
stability 4.5; legal/operational safety 4.5.

Ajv is the strongest direct dependency candidate in this audit. Lumen should
own versioned standard schemas, precompile standalone validators where useful,
and keep cross-reference/domain validation separate. Untrusted schemas must be
treated as executable input; coercion/default mutation must not masquerade as
migration.

## Playwright

Evidence:

- [packages](https://github.com/microsoft/playwright/tree/v1.60.0/packages)
- [tests](https://github.com/microsoft/playwright/tree/v1.60.0/tests)
- [snapshot behavior](https://github.com/microsoft/playwright/blob/v1.60.0/docs/src/test-snapshots-js.md)
- [trace viewer](https://github.com/microsoft/playwright/blob/v1.60.0/docs/src/trace-viewer-intro-js.md)
- [license](https://github.com/microsoft/playwright/blob/v1.60.0/LICENSE)

Scores: E2E 5; visual verification 4; JS/web fit 5; diagnostics 5; stability 4;
legal/operational safety 4.5.

Playwright is the leading candidate for creator-flow E2E, traces, video,
screenshots, and browser projects. It does not replace headless simulation or
real-device WebGPU coverage. Pixel comparisons require controlled environments
and semantic/metric assertions should be preferred where possible.

## Vite

Evidence:

- [core](https://github.com/vitejs/vite/tree/v8.0.16/packages/vite)
- [plugin API](https://github.com/vitejs/vite/blob/v8.0.16/docs/guide/api-plugin.md)
- [playground tests](https://github.com/vitejs/vite/tree/v8.0.16/playground)
- [release policy](https://github.com/vitejs/vite/blob/v8.0.16/docs/releases.md)
- [migration documentation](https://github.com/vitejs/vite/blob/v8.0.16/docs/guide/migration.md)
- [license](https://github.com/vitejs/vite/blob/v8.0.16/LICENSE.md)

Scores: development DX 5; web build 5; extensibility 5; verification 5;
stability 4; legal/operational safety 4.5.

Vite should remain behind a thin Lumen tooling boundary. Project authors should
not need to understand or maintain a plugin graph. Runtime APIs and persistent
project formats must never depend on Vite behavior.

## Yarn Spinner

Evidence pending an exact pin:

- [compiler](https://github.com/YarnSpinnerTool/YarnSpinner/tree/main/YarnSpinner.Compiler)
- [runtime](https://github.com/YarnSpinnerTool/YarnSpinner/tree/main/YarnSpinner)
- [grammar](https://github.com/YarnSpinnerTool/YarnSpinner/tree/main/YarnSpinner.Compiler/Grammars)
- [tests](https://github.com/YarnSpinnerTool/YarnSpinner/tree/main/YarnSpinner.Tests)
- [changelog](https://github.com/YarnSpinnerTool/YarnSpinner/blob/main/CHANGELOG.md)
- [license](https://github.com/YarnSpinnerTool/YarnSpinner/blob/main/LICENSE.md)

Scores: narrative authoring 5; compiler/VM model 5; JS/web fit 2;
extensibility 4.5; verification 4.5; stability 4; legal/operational safety 3.

The language-to-bytecode-to-VM split, diagnostics, line IDs, localization,
variables, commands, and presentation separation are excellent references. The
official core is C#, so direct adoption would require a port, WASM/toolchain, or
an independent implementation. Dialogue commands also must not become an
untyped substitute for spatial events and cutscenes.

## Decisions

- Keep a Lumen-owned canonical project format with stable IDs, versions,
  schemas, and migrations.
- Start with external Tiled integration; support LDtk through an optional
  adapter if demand warrants it.
- Advance Ajv, Playwright, and Vite to executable dependency spikes.
- Use Yarn Spinner as a conceptual source and compare it with ink/inkjs before
  settling dialogue syntax or runtime.
