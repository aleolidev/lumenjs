export const manifestSchema = {
  $id: "https://lumenjs.dev/schema/first-light-manifest-v1.json",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "projectId", "title", "version", "startMap", "sources"],
  properties: {
    schemaVersion: { const: 1 },
    projectId: { $ref: "#/$defs/id" },
    title: {
      type: "string",
      pattern:
        "^(?![\\s\\S]*(?:\\p{Cc}|\\p{Zl}|\\p{Zp}|\\p{Bidi_Control}|[\\u200B\\u2060\\uFEFF]))[\\s\\S]*[\\p{L}\\p{N}\\p{P}\\p{S}][\\s\\S]*$"
    },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    startMap: { $ref: "#/$defs/id" },
    sources: {
      type: "object",
      additionalProperties: false,
      required: ["map", "world"],
      properties: {
        map: { $ref: "#/$defs/mapFile" },
        world: { $ref: "#/$defs/lumenFile" },
        campaign: { $ref: "#/$defs/lumenFile" },
        additionalMaps: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "map", "world"],
            properties: {
              id: { $ref: "#/$defs/id" },
              map: { $ref: "#/$defs/mapFile" },
              world: { $ref: "#/$defs/lumenFile" }
            }
          }
        }
      }
    }
  },
  $defs: {
    id: {
      type: "string",
      pattern: "^(?!(?:constructor|prototype)$)[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
    },
    mapFile: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*[.]tmj$" },
    lumenFile: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*[.]lumen[.]json$" }
  }
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
          objects: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "name", "type", "x", "y"],
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                type: { type: "string" },
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number", minimum: 0 },
                height: { type: "number", minimum: 0 }
              }
            }
          },
          data: { type: "array", items: { type: "integer" } }
        }
      }
    }
  }
};

const reference = {
  type: "string",
  pattern: "^(?!(?:constructor|prototype)$)[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
};
const visibleText = {
  type: "string",
  pattern: "[\\p{L}\\p{N}\\p{P}\\p{S}]"
};

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
    mapSource: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*[.]tmj$" },
    spawn: reference,
    character: {
      type: "object",
      additionalProperties: false,
      required: ["object", "name", "messageBefore", "messageAfter"],
      properties: {
        object: reference,
        name: visibleText,
        messageBefore: visibleText,
        messageAfter: visibleText
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
    },
    additionalSpawns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "object"],
        properties: { id: reference, object: reference }
      }
    },
    mapTransitions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "object", "targetMap", "targetSpawn"],
        properties: {
          id: reference,
          object: reference,
          targetMap: reference,
          targetSpawn: reference,
          facing: { enum: ["north", "south", "west", "east"] }
        }
      }
    }
  }
};

export const continuityWorldSchema = {
  $id: "https://lumenjs.dev/schema/continuity-world-v2.json",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "mapId",
    "mapSource",
    "kind",
    "defaultSpawn",
    "spawns",
    "transitions"
  ],
  properties: {
    schemaVersion: { const: 2 },
    mapId: reference,
    mapSource: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*[.]tmj$" },
    kind: { const: "interior" },
    defaultSpawn: reference,
    spawns: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "object"],
        properties: { id: reference, object: reference }
      }
    },
    character: {
      type: "object",
      additionalProperties: false,
      required: ["object", "name", "message", "messageWithGlintail"],
      properties: {
        object: reference,
        name: visibleText,
        message: visibleText,
        messageWithGlintail: visibleText
      }
    },
    transitions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "object", "targetMap", "targetSpawn"],
        properties: {
          id: reference,
          object: reference,
          targetMap: reference,
          targetSpawn: reference,
          facing: { enum: ["north", "south", "west", "east"] }
        }
      }
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
              speaker: visibleText,
              text: visibleText,
              choices: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "label", "effect"],
                  properties: {
                    id: reference,
                    label: visibleText,
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
          name: visibleText,
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
          name: visibleText,
          health: { type: "integer", minimum: 1 },
          speed: { type: "integer", minimum: 1 },
          moves: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            uniqueItems: true,
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
      uniqueItems: true,
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
