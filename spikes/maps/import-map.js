import { readFile } from "node:fs/promises";
import path from "node:path";

export async function importMap(mapPath, metadataPath) {
  const [map, metadata] = await Promise.all([readJson(mapPath), readJson(metadataPath)]);

  const sourcePath = mapPath instanceof URL ? mapPath.pathname : mapPath;
  if (metadata.source !== path.basename(sourcePath)) {
    throw new Error(`metadata source ${metadata.source} does not match ${mapPath}`);
  }

  const objectLayers = map.layers.filter((layer) => layer.type === "objectgroup");
  const sourceEvents = objectLayers
    .flatMap((layer) => layer.objects)
    .filter((object) => object.type === "lumen-event");
  const sourceIds = new Set(sourceEvents.map((event) => event.name));

  for (const eventId of Object.keys(metadata.events)) {
    if (!sourceIds.has(eventId)) {
      throw new Error(`metadata references missing Tiled event ${eventId}`);
    }
  }

  return {
    id: metadata.mapId,
    source: { format: "tiled-json", version: map.tiledversion },
    size: { width: map.width, height: map.height },
    layers: map.layers.map((layer) => ({ id: layer.id, name: layer.name, type: layer.type })),
    events: sourceEvents.map((event) => ({
      id: event.name,
      position: { x: event.x / map.tilewidth, y: event.y / map.tileheight },
      ...metadata.events[event.name]
    }))
  };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
