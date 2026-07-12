# Minimum encounter core completion audit

Audit date: 2026-07-12.

Scope: extend the unpublished TypeScript core with the smallest deterministic
one-against-one encounter independently exercised by Willowbound and Tideglass
Reach. This audit does not approve npm publication or establish capture,
recruitment, experience, levels, inventory, trainers, quests, status effects,
randomness, configurable AI, multiple active creatures, animation, or a general
event contract.

| # | Requirement | Authoritative evidence | Result |
| ---: | --- | --- | --- |
| 1 | Two-game evidence | Willowbound and Tideglass Reach declare distinct companions, opponents, encounters, and second-map trigger geometry | Proven. |
| 2 | Explicit trigger authoring | Creator worlds require `encounters` entries with trigger, Tiled object, and campaign encounter IDs | Proven. |
| 3 | Trigger validation | Schema and semantic tests cover type, missing encounter, bounds/collision through shared object validation, and cross-kind cell ambiguity | Proven. |
| 4 | Safe refactor | Encounter rename updates definition, trainer, quest, and world trigger references in one validated operation | Proven. |
| 5 | Small public actions | `GameAction` adds only `use-move` and `finish-battle`; existing `Game` methods remain unchanged | Proven. |
| 6 | Version honesty | Core state and save formats advance to `v3-experimental` instead of silently widening v2 | Proven. |
| 7 | Companion gate | An incomplete trigger without a selected companion preserves position and emits `encounter-companion-required` | Proven. |
| 8 | Deterministic turns | Speed orders attacks, ally wins ties, fixed power clamps health, uses decrement, defeated actors do not act, and enemy selects its first usable move | Proven. |
| 9 | Exhaustion | An enemy with no remaining authored move skips and emits an explanatory fact without inventing behavior | Proven. |
| 10 | Results and retry | Victory completes and disables the trigger; defeat leaves it incomplete and resets the player to the active map's default spawn | Proven. |
| 11 | Mode isolation | World, dialogue, and battle actions reject incompatible modes; active battles reject finish and resolved battles reject moves | Proven. |
| 12 | Snapshot isolation | Mutating returned participant data cannot change the live session | Proven. |
| 13 | Save safety | Active map/trigger/position, party/opponent identity, authored definitions, completion, health, uses, and outcome are validated | Proven. |
| 14 | Reachable saves | The validator explores deterministic authored move sequences and rejects exact-shape battle states unreachable from a fresh encounter | Proven. |
| 15 | Willowbound runtime | Bramblefin defeats Prismole; repeated post-save execution produces identical ordered facts and final state | Proven. |
| 16 | Tideglass runtime | Gustling independently defeats Beacon Mite and preserves completion through save/restore | Proven. |
| 17 | Accessible web export | Render-ready names, health, uses, result, mode-specific buttons, and finish action run through the compiled core | Proven. |
| 18 | Browser and touch evidence | Both encounters run in Chromium, Firefox, and WebKit; a narrow Chromium touch-capable context taps the same move action boundary | Proven. |
| 19 | Clean consumer | Strict packaged declarations compile battle actions and state; clean CLI and export workflow still pass | Proven. |
| 20 | Existing product regression | Full CI, production/Cloudflare checks, and headed real-WebGPU First Light gate pass | Proven. |
| 21 | No premature expansion | No capture, recruitment, progression, inventory, trainer, quest, random, configurable-AI, general-event, I/O, DOM, renderer, or WebGPU contract entered the core | Proven by source and export inventory. |
| 22 | No publication | No npm publication action, registry authority, or compatibility promise was added | Proven. |

## Verification record

- `npm run ci`: 230 Node tests passed; 85 portable browser tests passed in
  Chromium, Firefox, and WebKit; three GPU-only cases and two redundant
  cross-engine touch-encounter cases skipped as designed; production and
  Cloudflare build verification passed.
- `npm run test:gpu`: headed Chromium rendered both First Light continuity maps
  through real WebGPU within fixture budgets.
- `npm run check:release`: 25 files packed reproducibly with SHA-256
  `cda04960652a8c94e9c3bddfb8b43fa79dc26762dcd5894ce782f71cfd5229d0`;
  clean JavaScript and strict TypeScript imports, creator CLI workflow, and
  static export passed.

## Boundary decision

The evidence supports one fixed deterministic encounter: a selected companion,
one opponent, authored health/speed/moves, exact power, fixed enemy move order,
and explicit victory/defeat continuation. It does not support a reusable battle
framework or First Light's broader campaign architecture.

npm remains unpublished. Publication still requires the owner and external
evidence gates in `phase-5-owner-decision-checklist.md`.
