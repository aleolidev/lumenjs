# LumenJS

LumenJS is an Apache-2.0-licensed JavaScript and WebGPU platform being developed for
creating polished, original creature-RPG fangames through an approachable
modern workflow. The current `0.1.0` CLI candidate remains unpublished and
experimental; its internal schemas and modules are not public compatibility
contracts.

The repository currently contains **First Light** and its campaign-continuity
slice. It turns external Tiled maps and Lumen-owned gameplay metadata into a
validated, deterministic, WebGPU-rendered playtest. Its renderer uses a
rectangular top-down 2.5D camera, pixel-art textures and sprites, plus one simple
textured 3D structure. The campaign adds dialogue, a companion choice, one
turn-based battle, item use, victory, loss, and an authored recruitment outcome.
The campaign continues into Lantern House and across browser sessions through a
three-generation local save with recovery and portable, migrated JSON saves.

## Run First Light

Requirements: Node.js 22 and npm 11.

This section requires a full repository checkout. The CLI tarball does
not contain First Light, browser assets, examples, or development dependencies.

```sh
npm ci --ignore-scripts
npm run dev
```

Open the local address printed by Vite. Move with WASD or the arrow keys and
interact with Space; the on-screen movement pad dispatches the same actions for
touch input. Speak to Mira, choose a companion, complete the encounter,
then enter Lantern House. Save and Load use the local `journey` slot; Export and
Import use a validated portable JSON envelope with an explicit replacement
preview. The continuity replay button executes the recorded route through both
maps. The visual-mode button switches optional
color grading without changing world or battle state; Classic keeps the
ungraded pixel-art presentation.

WebGPU is required for rendering. When it is unavailable, First Light reports
that capability explicitly while still validating the project and exercising
the semantic browser workflow.

## Verify

```sh
npx --no-install playwright install chromium firefox webkit
npm run ci
npm run test:gpu
npm run check:release
```

`ci` runs formatting/linting, static analysis, Node tests, the production build,
and Chromium/Firefox/WebKit browser tests without claiming GPU support.
`test:gpu` remains separate: it opens headed Chromium and requires a real WebGPU
adapter. The explicit install command resolves the already locked local
Playwright package; it does not permit npx to download a different tool.
`check:release` creates an unpublished tarball, installs it into a clean
temporary consumer, and exercises the creator and export workflow. The manual
release-candidate workflow likewise uploads a short-lived artifact but contains
no publication command or registry credentials.
The main `ci` command also checks that the Cloudflare Pages build contains the
declared headers, hashed entry assets, only regular files, and no environment,
source-map, or Wrangler credential/configuration files.

The production Vite output is prepared for Cloudflare Pages with `npm run build`
and output directory `dist`. See `docs/cloudflare-pages-deployment.md`; no public
hosting claim is made until the owner connects and verifies a real HTTPS origin.

## Experimental creator tools

Phase 3 adds an experimental clean-room workflow without changing the First
Light runtime API:

The commands below use the repository script. For a locally installed
tarball, replace `npm run lumen --` with `npx --no-install lumen`.

```sh
npm run lumen -- create my-journey --name "My Journey"
npm run lumen -- validate my-journey
npm run lumen -- inspect my-journey
npm run lumen -- focus my-journey --map willow-crossing --spawn crossing-start --locale es
npm run lumen -- rename my-journey --kind creature --from old-id --to new-id
npm run lumen -- rename my-journey --kind creature --from old-id --to new-id --apply
npm run lumen -- backups my-journey
npm run lumen -- restore my-journey --generation 1
npm run lumen -- restore my-journey --generation 1 --apply
npm run lumen -- export my-journey --out my-journey-web
npm run lumen -- verify-export my-journey-web
```

The scaffold keeps geometry in Tiled JSON and gameplay meaning in separate
Lumen-owned files. Validation reports coded source pointers and remedies;
export copies only declared inputs and writes deterministic SHA-256 metadata.
Repository checkouts include `examples/willowbound` as the original clean-room
acceptance fixture. The CLI tarball deliberately excludes examples; its
`create` command generates the equivalent original starter project.
`examples/tideglass-reach` is a second repository consumer with a distinct
project identity, map and creature IDs, prose, and export cache namespace. It
provides another local validation case, not an independent compatibility claim.
`inspect --json` also exposes the exact experimental schema, Tiled, locale, and
context-contribution versions present in a validated project under an explicit
no-compatibility-promise policy.

The scaffold owns prose in validated English and Spanish locale catalogs.
`rename` previews every cross-file reference change; `--apply` validates a staged
copy and creates an immutable numbered backup under `.lumen/backups/` before
replacing source files.
`backups` verifies every immutable generation and recorded SHA-256 pre-image.
`restore` previews an older valid generation; `--apply` first records the current
files as a safety generation and rolls back automatically when a commit or
final-validation failure is caught. Abrupt process termination may instead
require inspecting the cooperative locks and restoring that safety generation.
Rename and restore applies share a per-project cooperative write reservation;
a concurrent mutation fails before validation or source changes. Export uses a
shared read reservation while validating and copying a consistent source
snapshot, so multiple exports can coexist but never overlap a writer.
After an abrupt process or machine stop, inspect sibling
`.<project>.lumen-write-lock`, `.<project>.lumen-read-lock-*`, and
`.<project>.lumen-lock-gate` directories. Remove them only after confirming no
creator process is still using that project.
The same rule applies to an `<output>.lumen-export-lock` left beside an export
destination.
`verify-export` checks the received manifest, exact file and implied-directory
inventory, paths, symlinks, and SHA-256 values without changing the export. The unsigned manifest
proves integrity relative to itself, not publisher identity or authenticity.
Static exports also register a content-versioned service worker and pre-cache
their verified files for offline use. This is an experimental offline boundary,
not an installable-PWA claim: creator-owned application icons and a web app
manifest are deliberately absent.

The Willowbound fixture also exercises schema-driven creature, dialogue,
encounter, trainer, and narrow quest-like authoring. Trainer and quest records
validate references but intentionally define no general event language or
public runtime contract.

`focus` validates a map/spawn/locale entry and returns a deterministic initial
state and static-export query. The exported page provides an experimental
keyboard/button grid playtest with localized character interaction, map
transitions, structured facts, and a live runtime inspector. It is intentionally
separate from First Light and is not a public engine module.

Phase 4 research adds one internal experimental context boundary. Willowbound's
`workshop-atmosphere` and `careful-traveler` data modules independently own
terrain/weather and challenge-policy fields. Validation rejects ownership
conflicts, inspection exposes provenance and a deterministic context hash, and
optional module absence remains readable. No executable plugin loading or
public replacement API is implied.

The preset, creator schemas, CLI JSON, and export layout are experimental. They
are research artifacts rather than public compatibility contracts.

## Creator sources

- `public/first-light/lantern-vale.tmj`: spatial source edited in Tiled.
- `public/first-light/world.lumen.json`: typed gameplay metadata.
- `public/first-light/lantern-house.tmj`: original interior in Tiled JSON.
- `public/first-light/lantern-house.lumen.json`: interior metadata.
- `public/first-light/campaign.lumen.json`: dialogue, creature, move, encounter,
  party, and inventory data.
- `public/first-light/project.lumen.json`: project manifest.
- `public/first-light/continuity-replay.json`: canonical two-map campaign replay.
- `tests/fixtures/first-light/`: canonical Phase 1/campaign replays, negative
  sources, and the static Phase 2A migration fixture, all excluded from
  production builds.

First Light is an internal prototype. Its production boundaries are not yet a
public engine API.
