export const manifestSchema = {
  $id: "https://lumenjs.dev/schema/first-light-manifest-v1.json",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "projectId", "title", "version", "startMap", "sources"],
  properties: {
    schemaVersion: { const: 1 },
    projectId: { $ref: "#/$defs/id" },
    title: { type: "string", minLength: 1 },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    startMap: { $ref: "#/$defs/id" },
    sources: {
      type: "object",
      additionalProperties: false,
      required: ["map", "world"],
      properties: {
        map: { type: "string", pattern: "^[^/]+\\.tmj$" },
        world: { type: "string", pattern: "^[^/]+\\.lumen\\.json$" }
      }
    }
  },
  $defs: { id: { type: "string", pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" } }
};

export const tiledMapSchema = {
  $id: "https://lumenjs.dev/schema/tiled-map-subset-v1.json",
  type: "object",
  additionalProperties: true,
  required: ["type", "width", "height", "tilewidth", "tileheight", "layers"],
  properties: {
    type: { const: "map" },
    width: { type: "integer", minimum: 1 },
    height: { type: "integer", minimum: 1 },
    tilewidth: { type: "integer", minimum: 1 },
    tileheight: { type: "integer", minimum: 1 },
    tiledversion: { type: "string" },
    layers: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name", "type"],
        properties: {
          id: { type: "integer" },
          name: { type: "string", minLength: 1 },
          type: { enum: ["tilelayer", "objectgroup"] },
          objects: { type: "array" },
          data: { type: "array", items: { type: "integer" } }
        }
      }
    }
  }
};

const reference = { type: "string", pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" };

export const worldSchema = {
  $id: "https://lumenjs.dev/schema/first-light-world-v1.json",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "mapId",
    "mapSource",
    "spawn",
    "character",
    "beacon",
    "bridge",
    "transition"
  ],
  properties: {
    schemaVersion: { const: 1 },
    mapId: reference,
    mapSource: { type: "string", pattern: "^[^/]+\\.tmj$" },
    spawn: reference,
    character: {
      type: "object",
      additionalProperties: false,
      required: ["object", "name", "messageBefore", "messageAfter"],
      properties: {
        object: reference,
        name: { type: "string", minLength: 1 },
        messageBefore: { type: "string", minLength: 1 },
        messageAfter: { type: "string", minLength: 1 }
      }
    },
    beacon: {
      type: "object",
      additionalProperties: false,
      required: ["object", "stateKey"],
      properties: { object: reference, stateKey: reference }
    },
    bridge: {
      type: "object",
      additionalProperties: false,
      required: ["deck", "underpass"],
      properties: { deck: reference, underpass: reference }
    },
    transition: {
      type: "object",
      additionalProperties: false,
      required: ["object", "target"],
      properties: { object: reference, target: reference }
    }
  }
};
