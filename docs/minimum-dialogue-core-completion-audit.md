# Minimum dialogue core completion audit

Audit date: 2026-07-12.

Historical baseline: this audit remains evidence for the dialogue increment. Its
encounter exclusion was superseded by `minimum-encounter-core-specification.md`
after both games supplied explicit trigger and runtime evidence.

Scope: extend the unpublished minimum TypeScript core only with the localized
dialogue and companion-choice behavior independently authored by Willowbound and
Tideglass Reach. This audit does not approve npm publication or promote battle,
encounter, quest, trainer, inventory, event, renderer, or persistence-adapter
contracts.

| # | Requirement | Authoritative evidence | Result |
| ---: | --- | --- | --- |
| 1 | Two-game need | Both campaign documents declare localized two-node companion dialogues; both world documents bind their own character to a start node | Proven. |
| 2 | Explicit authored reference | Creator world schema requires `character.dialogue`; semantic validation reports missing nodes; safe dialogue rename updates character references | Proven. |
| 3 | Small public action | `GameAction` adds only `choose`; the existing `Game` methods remain unchanged | Proven. |
| 4 | Render-ready dialogue | State exposes speaker, localized message, stable IDs, and localized choice labels without source traversal | Proven. |
| 5 | Deterministic effects | Ordered facts cover open, select, companion, advance, and close; movement is unavailable while dialogue is open | Proven. |
| 6 | Party boundary | State holds at most one companion reachable from an authored `choose-companion` choice; encounter-only creatures are rejected from saves | Proven. |
| 7 | Version honesty | Core state and save formats advance from experimental v1 to experimental v2 rather than silently widening v1 | Proven. |
| 8 | Save safety | Exact fields, active-map character ownership, reachable nodes, authored localized content, selectable party, and inert malformed rejection are tested | Proven. |
| 9 | Isolation and invalid input | Returned dialogue choices are cloned; unknown/mode-invalid actions throw without replacing live state | Proven. |
| 10 | Willowbound runtime | Oren opens Spanish dialogue, Bramblefin is selected, the second node closes, and party survives save/restore | Proven. |
| 11 | Tideglass runtime | Sela independently opens Spanish dialogue, Gustling is selected, the second node closes, and party survives save/restore | Proven. |
| 12 | Generated web export | The exported accessible dialogue panel runs the compiled core for both games in Chromium, Firefox, and WebKit | Proven. |
| 13 | Clean TypeScript consumer | Reproducible tarball installs cleanly; strict consumer declarations compile the `choose` action and party state | Proven. |
| 14 | Existing product regression | Full CI, Cloudflare build checks, and headed real-WebGPU First Light gate pass | Proven. |
| 15 | No premature expansion | No battle, encounter, quest, trainer, inventory, generic event, I/O, DOM, renderer, or WebGPU contract entered the core | Proven by source and export inventory. |
| 16 | No publication | Repository workflows and this work contain no npm publication action or new release authority | Proven. |

## Verification record

- `npm run ci`: 219 Node tests passed; 84 portable browser tests passed in
  Chromium, Firefox, and WebKit; three GPU-only portable cases skipped as
  designed; production and Cloudflare build verification passed.
- `npm run test:gpu`: the headed Chromium WebGPU test passed for both First
  Light continuity maps within fixture budgets.
- `npm run check:release`: 25 files packed reproducibly with SHA-256
  `1f5bed2416c65802749de2aa659689dc42b6d34208ea67f632af676d118de311`;
  clean JavaScript and strict TypeScript imports, CLI workflow, and static export
  passed.

## Boundary decision

The evidence supports a tiny dialogue state machine and one selected companion.
It does not support importing First Light's campaign architecture. Encounters,
battles, quests, inventory, conditional dialogue, scripting, and general events
remain outside the public core until at least two real projects require a shared
narrow behavior.

npm remains unpublished. Publication still requires the explicit owner and
external gates in `phase-5-owner-decision-checklist.md`.
