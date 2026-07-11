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
        world: { type: "string", pattern: "^[^/]+\\.lumen\\.json$" },
        campaign: { type: "string", pattern: "^[^/]+\\.lumen\\.json$" }
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

export const campaignSchema = {
  $id: "https://lumenjs.dev/schema/first-light-campaign-v1.json",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "dialogue",
    "moves",
    "creatures",
    "starters",
    "encounter",
    "inventory"
  ],
  properties: {
    schemaVersion: { const: 1 },
    dialogue: {
      type: "object",
      additionalProperties: false,
      required: ["start", "nodes"],
      properties: {
        start: reference,
        nodes: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "speaker", "text", "choices"],
            properties: {
              id: reference,
              speaker: { type: "string", minLength: 1 },
              text: { type: "string", minLength: 1 },
              choices: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "label", "effect"],
                  properties: {
                    id: reference,
                    label: { type: "string", minLength: 1 },
                    effect: { enum: ["choose-companion", "close-dialogue"] },
                    creature: reference,
                    next: reference
                  }
                }
              }
            }
          }
        }
      }
    },
    moves: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "power", "uses"],
        properties: {
          id: reference,
          name: { type: "string", minLength: 1 },
          power: { type: "integer", minimum: 1 },
          uses: { type: "integer", minimum: 1 }
        }
      }
    },
    creatures: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "health", "speed", "moves", "colors"],
        properties: {
          id: reference,
          name: { type: "string", minLength: 1 },
          health: { type: "integer", minimum: 1 },
          speed: { type: "integer", minimum: 1 },
          moves: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: reference
          },
          colors: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }
          }
        }
      }
    },
    starters: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: reference
    },
    encounter: {
      type: "object",
      additionalProperties: false,
      required: ["id", "creature", "recruitAfterVictory"],
      properties: {
        id: reference,
        creature: reference,
        recruitAfterVictory: { const: true }
      }
    },
    inventory: {
      type: "object",
      additionalProperties: false,
      required: ["sunberry"],
      properties: { sunberry: { type: "integer", minimum: 1, maximum: 1 } }
    }
  }
};
