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
