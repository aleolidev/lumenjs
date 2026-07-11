const white = [1, 1, 1, 1];
const waterTint = [0.82, 0.98, 1, 1];
const shadowTint = [1, 1, 1, 0.42];

export function buildScene(world, state, { visualMode = "classic" } = {}) {
  const items = [];
  for (let y = 0; y < world.map.height; y += 1) {
    for (let x = 0; x < world.map.width; x += 1) {
      const path = y === 7 || (x >= 4 && x <= 5 && y >= 4 && y <= 7);
      items.push({
        id: `ground-${x}-${y}`,
        kind: "surface",
        texture: "atlas",
        atlas: path ? 2 : (x * 3 + y) % 7 === 0 ? 1 : 0,
        x,
        y,
        width: 1,
        height: 1,
        elevation: 0,
        depth: baseDepth(y, 0),
        tint: white
      });
    }
  }

  for (const collision of world.collisions) {
    if (collision.id === "south-pond") {
      items.push({
        id: collision.id,
        kind: "surface",
        texture: "atlas",
        atlas: 3,
        ...collision,
        elevation: 0.015,
        depth: baseDepth(collision.y + collision.height, 0.01),
        tint: waterTint
      });
      continue;
    }
    items.push({
      id: collision.id,
      kind: "surface",
      texture: "atlas",
      atlas: collision.id === "east-grove" ? 4 : 5,
      ...collision,
      elevation: collision.id === "east-grove" ? 0.55 : 0.25,
      depth: baseDepth(collision.y + collision.height, 0.08),
      tint: white
    });
  }

  items.push({
    id: "vale-house",
    kind: "building",
    texture: "atlas",
    x: 1,
    y: 2,
    width: 3,
    height: 2,
    elevation: 2.15,
    roofAtlas: 8,
    wallAtlas: 9,
    depth: baseDepth(3, 0.16),
    tint: white
  });

  items.push({
    id: "east-trail",
    kind: "surface",
    texture: "atlas",
    atlas: 2,
    ...world.transition,
    elevation: 0.02,
    depth: baseDepth(world.transition.y, 0.02),
    tint: [0.82, 1, 0.9, 1]
  });

  const playerUnderBridge = contains(world.bridge.underpass, state.player);
  const playerOnBridge = contains(world.bridge.deck, state.player);
  items.push({
    id: "bridge-shadow",
    kind: "surface",
    texture: "atlas",
    atlas: 15,
    ...world.bridge.underpass,
    elevation: 0.03,
    depth: baseDepth(world.bridge.underpass.y, 0.03),
    tint: shadowTint
  });
  items.push({
    id: "sunbeam-bridge",
    kind: "surface",
    texture: "atlas",
    atlas: 6,
    ...world.bridge.deck,
    elevation: 0.82,
    depth: playerUnderBridge ? 0.92 : baseDepth(world.bridge.deck.y, 0.14),
    tint: white
  });

  items.push({
    id: "old-beacon",
    kind: "sprite",
    texture: "atlas",
    atlas: state.flags[world.beacon.stateKey] ? 10 : 11,
    ...world.beacon,
    width: 0.9,
    spriteHeight: 1.35,
    depth: baseDepth(world.beacon.y, 0.12),
    tint: white
  });
  items.push({
    id: "vale-guide",
    kind: "sprite",
    texture: "mira",
    ...world.character,
    width: 0.8,
    spriteHeight: 1.45,
    depth: baseDepth(world.character.y, 0.13),
    tint: white
  });
  items.push({
    id: "player",
    kind: "sprite",
    texture: "player",
    ...state.player,
    width: 0.72,
    spriteHeight: 1.35,
    elevation: playerOnBridge ? 0.82 : 0,
    depth: playerOnBridge ? 0.96 : baseDepth(state.player.y, 0.14),
    tint: white
  });

  return {
    projection: "top-down-three-quarter-v1",
    visualMode,
    camera: {
      x: clamp(state.player.x + 0.5, 5, world.map.width - 5),
      y: clamp(state.player.y + 0.6, 5, world.map.height - 5),
      pitchDegrees: 38
    },
    items,
    semantics: {
      projection: "top-down-three-quarter-v1",
      visualMode,
      texturedItemCount: items.filter((item) => item.texture).length,
      spriteCount: items.filter((item) => item.kind === "sprite").length,
      simple3dCount: items.filter((item) => item.kind === "building").length,
      playerUnderBridge,
      playerOnBridge,
      bridgeDepth: items.find((item) => item.id === "sunbeam-bridge").depth,
      playerDepth: items.find((item) => item.id === "player").depth
    }
  };
}

function baseDepth(y, offset) {
  return Math.min(0.89, 0.05 + y * 0.035 + offset);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function contains(rectangle, point) {
  return (
    point.x >= rectangle.x &&
    point.y >= rectangle.y &&
    point.x < rectangle.x + rectangle.width &&
    point.y < rectangle.y + rectangle.height
  );
}
