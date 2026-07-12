# LumenJS

LumenJS is being developed as an open-source JavaScript and WebGPU platform for
creating polished creature-RPG fangames with an approachable, modern workflow.

## Principles

- Keep the project simple, small, clean, and easy to understand.
- A change should leave the project easier to understand than before.
- Start as one package; do not introduce a monorepo without demonstrated need.
- Keep the public API small and dependencies explicit and unidirectional.
- Prefer composition, browser APIs, and zero mutable global state.
- Require no runtime framework and avoid premature abstractions.
- Do not impose arbitrary file-size or line-count limits.
- Treat a small extensible core plus shareable modules as a working direction,
  not a settled architecture until research and real use cases validate it.
- Keep protected brands, assets, data, and content outside LumenJS.
- Record sources, licenses, provenance, and adaptations for external references.

## Current phase

Phases 1–4 are complete as scoped local experimental evidence. Phase 5 is
active: prepare the Apache-2.0 `0.1.0` public experimental CLI candidate while
preserving explicit owner and external-evidence gates. Do not publish a package,
connect a hosting account, claim supported public hosting, installable-PWA or
physical-device coverage, promise compatibility, or introduce operated services
without the recorded decisions and evidence in
`docs/phase-5-owner-decision-checklist.md`.

Existing runtime structure remains internal and research-driven. Do not expand
it into a public engine architecture or compatibility contract without new
multi-project evidence.
