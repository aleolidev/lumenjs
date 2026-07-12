# Phase 2B campaign-continuity completion audit

Audit date: 2026-07-12 re-audit; original acceptance 2026-07-11.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Validate maps and cross-map references before state | Importer plus broken/missing, duplicate IDs, malformed, primary/additional out-of-bounds, and colliding-spawn Node tests | Proven. |
| 2 | Fixed replay through and out of Lantern House | Continuity replay and deterministic Node test | Proven. |
| 3 | Party-aware dialogue without UI rules | Simulation-owned Glintail branch | Proven. |
| 4 | Restore complete campaign meaning | Full-state browser assertion | Proven. |
| 5 | Atomic snapshot and pointer | Injected abort in all three browsers | Proven. |
| 6 | Recover newest corruption | Checksum fallback in all browsers | Proven. |
| 7 | Valid portable export | Strict envelope and canonical SHA-256; button download has exact filename and parseable v2 identity in Chromium, Firefox, and WebKit | Proven. |
| 8 | Invalid import is inert | Runtime and store before/after assertions | Proven. |
| 9 | Replacement has recoverable backup | Parent generation and corruption test | Proven. |
| 10 | Preserve Phase 2A meaning in v1→v2 | Static fixture, projection, old-shape hash | Proven. |
| 11 | Accessible UI and diagnostics | Live status, modal preview, pointers, narrow test | Proven. |
| 12 | Browser-free coverage | 31 Node tests | Proven. |
| 13 | Three-browser acceptance | 33 portable browser tests | Proven. |
| 14 | Headed WebGPU renders both maps within budget | Each map contributes ≥60 submitted frames; both have zero errors, ≤4 draws, ≤256 KiB, and <4 ms median CPU | Proven. |
| 15 | Build and boundary documents | Build, provenance, retrospective, this audit | Proven. |
| 16 | No new public shape | README and retrospective scope | Proven. |
| 17 | Concurrent retention safety | Five overlapping saves in three browsers | Proven. |
| 18 | Post-commit cleanup semantics | Injected maintenance failure preserves a valid load; an injected pointer corruption between commit and cleanup returns deferred maintenance and preserves both generations in three browsers | Proven. |
| 19 | Strict nested snapshot semantics | Correctly rehashed mutation matrix plus every canonical replay prefix; extra `a/b~` envelope, map-state, and flag keys report exact escaped pointers | Proven. |
| 20 | Explicit migration source version | Rehashed v1 envelope with unregistered project version is rejected | Proven. |
| 21 | Reserved ID rejection | Primary and additional-map schema mutations fail before resolved state | Proven. |
| 22 | Pre-transaction store validation | Invalid correctly rehashed envelope leaves generation 1 untouched in three engines | Proven. |
| 23 | Import-modal isolation | Background keyboard input is inert and Escape clears pending import in three engines | Proven. |
| 24 | Single import confirmation | Two simultaneous confirmations yield one commit and one pre-write rejection; controls and Escape cannot imply cancellation during commit in three engines | Proven. |
| 25 | Async control failure reporting | Injected export failure reaches diagnostics/live status and preserves state; reload then proves the real download path in all three engines | Proven. |
| 26 | Canonical timestamp metadata | Producer/import structure rejects non-ISO UTC timestamp strings | Proven. |
| 27 | Authored party and battle roles | Rehashed encounter-as-ally, encounter-only victory, premature battle, and post-result health snapshots are rejected | Proven. |
| 28 | Optional storage capability diagnostics | Rejected persistence and quota queries degrade to null while First Light starts in all three engines | Proven. |
| 29 | Lossless legacy shape boundary | Correctly rehashed v1 snapshot with an unknown field is rejected before migration | Proven. |
| 30 | Prebattle inventory relation | Correctly rehashed initial snapshot with prematurely consumed inventory is rejected | Proven. |
| 31 | Manifest-first graceful bootstrap | Null/malformed manifest and HTTP 503 campaign routes yield source-linked diagnostics; an injected IndexedDB-open denial reaches an explicit startup status; every failure ends at clean `data-ready=error` without `pageerror` in three engines | Proven. |
| 32 | Exact manifest/source correspondence | Direct-import tests reject omitted/injected campaigns, missing continuity campaign, omitted/extra maps, and forged map source descriptors | Proven. |
| 33 | Diagnostic direct-import root boundary | Null, boolean, number, string, and array roots return `/` diagnostics through both import entry points | Proven. |
| 34 | Control-free visible project title | Runtime schema uses Unicode `Bidi_Control` and rejects zero-width-only, visible-plus-control, Arabic Letter Mark, and line/paragraph-separator titles before state; useful Unicode including ZWJ emoji remains accepted | Proven. |
| 35 | Reachable spawn/transition cells | Primary/additional importer mutations reject transitions in collision or on blocking characters; primary spawn collision and occupied-character mutations also fail | Proven. |
| 36 | Cross-map diagnostic aggregation | Combined duplicate-primary-spawn and missing-later-target mutation reports both failures with null project state | Proven. |
| 37 | Reachable map-history prefix | Correctly rehashed snapshots reject a valid secondary state before result and an active secondary state that drops the retained start map | Proven. |
| 38 | World-message and transition chronology | Correctly rehashed arbitrary message, victory message without outcome, and transition-before-tick mutations fail; every replay prefix and v1 fixture remain valid | Proven. |
| 39 | Multimap save-prefix coverage | Every canonical continuity replay prefix creates an envelope; forged house-special message without Glintail fails | Proven. |
| 40 | Complete authored flag namespace | Correctly rehashed snapshots reject unknown flags, omission of `beacon-lit`, and a recognized retained message while the beacon is false | Proven. |
| 41 | Own-property exact shapes | Direct producer snapshot with prototype-inherited `format` fails as missing before cloning/hash | Proven. |
| 42 | Own-property authored references | Correctly rehashed reserved active-map, map-history, party, and dialogue mutations produce stable semantic issues; all map, creature, dialogue, and move lookups use own-entry checks | Proven. |
| 43 | Reachable dialogue party state | Correctly rehashed start-node-with-starter and post-choice-node-without-starter snapshots fail; every canonical replay prefix remains valid | Proven. |
| 44 | Battle action-resource chronology | Rehashed extra-turn and unearned-item-consumption mutations fail; canonical in-progress, victory, and loss replay envelopes account for speed-dependent final actions | Proven. |
| 45 | Tick-zero world-effect chronology | Rehashed tick-zero beacon and recognized-message mutations fail; canonical replay prefixes remain valid | Proven. |
| 46 | Unambiguous transition areas | Additional-map mutation adds a distinct transition ID over the same object; import reports overlap and returns no project/state | Proven. |
| 47 | Visible world/campaign text | World-character and dialogue-text mutations reject whitespace/zero-width-only content before state; a positive campaign retains emoji and multiline prose | Proven. |
| 48 | Safe source discovery | Node mutations reject backslash-bearing and case-colliding manifest sources; a three-engine route assertion observes zero escaped-source requests | Proven. |
| 49 | Corrupt generation metadata | Three-engine IndexedDB mutations replace pointer history with malformed identity/order and replace stored payload shape/generation; bounded descending history plus exact record fields, generation, parent, and checksum shape are enforced, load returns `pointer`/`record` failures with no envelope or exception, and save against either corrupt pointer is byte-logically inert | Proven. |
| 50 | Own-property project imports | `ownProperties` validators plus pre-semantic cloning reject inherited title, campaign, and additional-map declarations; primary and later-map required/additional diagnostics point to the exact escaped field, and a function-bearing root returns a stable `/` diagnostic | Proven. |

## Original completion verification record

- `npm run check`: formatting, types, and 33/33 Phase 2B Node tests pass.
- `npm run test:browser`: 36/36 Phase 2B portable tests pass; GPU-only tests skip.
- `npm run test:gpu`: headed Chromium passes across both active maps.
- `npm run build`: Vite production build passes.
- `git diff --check`: passes.

The current whole-repository verification baseline after later hardening is
maintained in `phase-5-distribution-progress-audit.md`.

A later concurrency audit found that cleanup originally used the retained IDs
computed by its initiating save. If a newer save committed first, that stale
cleanup could delete it. Cleanup now rereads the current pointer inside its own
serialized read/write transaction; five overlapping saves retain generations
3–5 and load generation 5 in Chromium, Firefox, and WebKit.
A separately injected cleanup failure returns `retentionCleanup: deferred`
instead of rejecting the already committed save; generation 1 remains valid and
loadable, and UI diagnostics can distinguish saved data from deferred
maintenance.
Correctly rehashed mutations now cover invalid world facing, authored
collisions, unknown map flags, duplicate/oversized party state, undeclared or
over-authored inventory,
incomplete dialogue and battle records, move-use overflow, and an
encounter-opponent mismatch. Mode/outcome and terminal-health relationships
must also describe a state reachable by the campaign simulation. Every prefix
of the canonical
campaign replay also creates a valid envelope, covering legitimate world,
dialogue, battle, result, and post-result states.
The deterministic loss replay also creates a valid envelope, while outcome
state must agree with encounter recruitment and defeated-creature health.
The sole v1 migration is now registered for the proven First Light `0.2.0`
source only. A known format label paired with another project version fails
before migration.
Map and spawn lookup tables now have null prototypes in both continuity and
creator-playtest resolution, so valid keys can never be mistaken for inherited
object properties even beyond the reserved-ID schema guard.
Envelope creation now runs the same structural contract enforced on import, so
missing artifact metadata fails at the producer boundary. Compound corruption
also yields `SaveValidationError` diagnostics instead of leaking internal type
errors from later semantic checks.
The generation store now validates before its read/write transaction. A
correctly rehashed but semantically invalid save is rejected without creating a
snapshot or advancing the slot pointer in Chromium, Firefox, or WebKit.
Party validation now preserves authored roles as well as IDs and maximum size.
The battle ally must be one of the declared starters; loss keeps one starter;
and a recruiting victory keeps exactly one starter plus the encounter creature.
Battle state is also rejected in pre-result world/dialogue states, and retained
post-result battle health must still agree with victory or loss after returning
to world mode. Legacy migrated completed saves may remain battle-free.

## Scope confirmation

No map, save, storage, dialogue, campaign, migration, or replay shape becomes a
public API. Multiple slots, cloud sync, merging, service workers, OPFS, audio,
input parity, localization, richer battles, quests, modules, editor
architecture, and long-term save compatibility remain deferred.
