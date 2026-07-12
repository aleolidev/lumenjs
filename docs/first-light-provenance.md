# First Light fixture provenance

All names, prose, map geometry, colors, and visual shapes in the First Light
fixture were created for LumenJS on 2026-07-11. They do not adapt or reproduce
assets, maps, data, characters, dialogue, or branding from a protected game.

The map is stored as Tiled JSON for interoperability, but its content was
authored specifically for this project.

The pixel-art atlas, player, and guide were generated for this repository with
OpenAI's built-in image generation tool on 2026-07-11. The supplied visual
references were used only to communicate top-down 2.5D camera direction. Prompts
explicitly prohibited copying their characters, maps, buildings, logos,
franchise symbols, or protected visual designs.

- `public/first-light/assets/lantern-vale-atlas.png`: original 4×4 terrain,
  architecture, object, and effect atlas.
- `public/first-light/assets/player.png`: original adventurer sprite.
- `public/first-light/assets/mira.png`: original guide sprite.
- `docs/art-source/first-light/`: chroma-key generation sources retained for
  provenance and future reprocessing.

The two sprite backgrounds were removed locally with the image-generation
skill's chroma-key helper. The delivered PNGs have alpha channels. No third-party
font or game asset is included.

The fixture may be distributed under the same license eventually selected for
LumenJS. Until that repository license is selected, this record establishes
origin but does not grant a separate license.

## Integrity snapshot

These hashes bind this provenance record to the current delivered images and
retained adaptation sources. They prove repository identity only; they are not
a signature, publisher-authenticity statement, or separate license grant.

| File | SHA-256 |
| --- | --- |
| `public/first-light/assets/lantern-vale-atlas.png` | `45b31f12488fd05b881e3c41b4af1803f46ea8a26b2de09a3dc638a9d7dab325` |
| `public/first-light/assets/mira.png` | `32ac3635cf396bf0d07f3dc33337dc2439f978bd7e9871e5709b191c3b29d543` |
| `public/first-light/assets/player.png` | `4bbf0ba43dd2018d8d4513ce80bfa403ddf6eda7e4c616556bcb97f91c3175d1` |
| `docs/art-source/first-light/mira-chroma-source.png` | `f19cbe0a4ac08f8ed2e2afd91a0c6719489b8034d8859ed5162fbe7ea95c843d` |
| `docs/art-source/first-light/player-chroma-source.png` | `e465ab6bf49d9ec0f72bf59bcee855f9dba347cd0056eae44becf89a1e817e37` |

## Phase 2 campaign slice

The names Embercub, Mossling, Glintail, their move names, creature statistics,
dialogue, encounter rules, and campaign data were authored specifically for
LumenJS on 2026-07-11. They do not adapt a protected game's creatures, moves,
characters, story, terminology, or balance data.

The Phase 2 playtest represents each creature with a small CSS-composed color
mark derived from the two colors in its validated creature record. These marks
were authored in `src/app/first-light.css`; they use no image, font, icon, or
third-party asset. They are fixture presentation, not final creature designs or
a general creature-art pipeline.

## Phase 2B campaign continuity

Lantern House, its map geometry, Mira's party-aware interior dialogue, spawn
names, transition names, save fixture metadata, and continuity replay were
authored specifically for LumenJS on 2026-07-11. The interior reuses the
repository's original atlas and Mira/player sprites; it introduces no external
asset, protected map, dialogue, branding, or third-party data.

The portable v1 save is a synthetic LumenJS regression fixture. Its timestamp,
campaign values, identifiers, and hash were created for this repository and do
not derive from a commercial game's save format.
