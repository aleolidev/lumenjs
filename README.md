# LumenJS

LumenJS is an open-source JavaScript and WebGPU platform for creating polished,
original creature-RPG fangames through an approachable modern workflow.

The repository currently contains **First Light**, the first vertical prototype.
It turns an external Tiled map and Lumen-owned gameplay metadata into a
validated, deterministic, WebGPU-rendered focused playtest. Its renderer uses a
rectangular top-down 2.5D camera, pixel-art textures and sprites, plus one simple
textured 3D structure.

## Run First Light

Requirements: Node.js 22 and npm 11.

```sh
npm ci --ignore-scripts
npm run dev
```

Open the local address printed by Vite. Move with WASD or the arrow keys and
interact with Space. Speak to Mira to light the beacon, then walk east to the
trail. The canonical replay button executes the recorded deterministic route.
The visual-mode button switches optional color grading without changing game
state; Classic keeps the ungraded pixel-art presentation.

WebGPU is required for rendering. When it is unavailable, First Light reports
that capability explicitly while still validating the project and exercising
the semantic browser workflow.

## Verify

```sh
npm run check
npm run test:browser
npm run test:gpu
npm run build
```

`test:browser` covers Chromium, Firefox, and WebKit without claiming GPU support.
`test:gpu` opens headed Chromium and requires a real WebGPU adapter.

## Creator sources

- `public/first-light/lantern-vale.tmj`: spatial source edited in Tiled.
- `public/first-light/world.lumen.json`: typed gameplay metadata.
- `public/first-light/project.lumen.json`: project manifest.
- `public/first-light/replay.json`: canonical versioned replay.

First Light is an internal prototype. Its production boundaries are not yet a
public engine API.
