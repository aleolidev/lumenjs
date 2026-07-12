const id = {
  type: "string",
  pattern: "^(?!(?:constructor|prototype)$)[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
};
const relativeJson = { type: "string", pattern: "^(?!/).+[.]json$" };
const relativeTmj = { type: "string", pattern: "^(?!/).+[.]tmj$" };
const contextKey = {
  type: "string",
  pattern: "^(?!(?:__proto__|constructor|prototype)$)[A-Za-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$"
};
const visibleText = {
  type: "string",
  pattern: "[\\p{L}\\p{N}\\p{P}\\p{S}]"
};

export const creatorManifestSchema = {
  $id: "https://lumenjs.dev/experimental/creator-manifest-v1.json",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "projectId", "title", "version", "startMap", "sources"],
  properties: {
    schemaVersion: { const: 1 },
    projectId: id,
    title: {
      type: "string",
      pattern:
        "^(?![\\s\\S]*(?:\\p{Cc}|\\p{Zl}|\\p{Zp}|\\p{Bidi_Control}|[\\u200B\\u2060\\uFEFF]))[\\s\\S]*[\\p{L}\\p{N}\\p{P}\\p{S}][\\s\\S]*$"
    },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    startMap: id,
    sources: {
      type: "object",
      additionalProperties: false,
      required: ["maps", "campaign", "provenance"],
      properties: {
        maps: {
          type: "array",
          minItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "map", "world"],
            properties: { id, map: relativeTmj, world: relativeJson }
          }
        },
        campaign: relativeJson,
        provenance: { type: "string", pattern: "^(?!/).+[.]md$" },
        locales: {
          type: "object",
          additionalProperties: false,
          required: ["default", "catalogs"],
          properties: {
            default: { type: "string", pattern: "^[a-z]{2}(?:-[A-Z]{2})?$" },
            catalogs: {
              type: "object",
              minProperties: 1,
              propertyNames: { pattern: "^[a-z]{2}(?:-[A-Z]{2})?$" },
              additionalProperties: relativeJson
            }
          }
        },
        contextModules: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "version", "source"],
            properties: {
              id,
              version: { type: "integer", minimum: 1 },
              source: relativeJson,
              optional: { type: "boolean" }
            }
          }
        },
        assets: {
          type: "array",
          items: { type: "string", pattern: "^(?!/).+" }
        }
      }
    }
  }
};

export const creatorWorldSchema = {
  $id: "https://lumenjs.dev/experimental/creator-world-v1.json",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "mapId",
    "mapSource",
    "defaultSpawn",
    "spawns",
    "characters",
    "transitions",
    "encounters"
  ],
  properties: {
    schemaVersion: { const: 1 },
    mapId: id,
    mapSource: relativeTmj,
    defaultSpawn: id,
    spawns: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "object"],
        properties: { id, object: id }
      }
    },
    characters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "object", "name", "messageKey", "dialogue"],
        properties: {
          id,
          object: id,
          name: visibleText,
          messageKey: id,
          dialogue: id
        }
      }
    },
    transitions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "object", "targetMap", "targetSpawn"],
        properties: { id, object: id, targetMap: id, targetSpawn: id }
      }
    },
    encounters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "object", "encounter"],
        properties: { id, object: id, encounter: id }
      }
    }
  }
};

export const creatorCampaignSchema = {
  $id: "https://lumenjs.dev/experimental/creator-campaign-v1.json",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "dialogue",
    "moves",
    "creatures",
    "encounters",
    "trainers",
    "quests",
    "inventory"
  ],
  properties: {
    schemaVersion: { const: 1 },
    messages: {
      type: "object",
      minProperties: 1,
      propertyNames: id,
      additionalProperties: visibleText
    },
    dialogue: {
      type: "object",
      additionalProperties: false,
      required: ["start", "nodes"],
      properties: {
        start: id,
        nodes: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "speaker", "messageKey", "choices"],
            properties: {
              id,
              speaker: visibleText,
              messageKey: id,
              choices: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "labelKey", "effect"],
                  properties: {
                    id,
                    labelKey: id,
                    effect: { enum: ["choose-companion", "close-dialogue"] },
                    creature: id,
                    next: id
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
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "power", "uses"],
        properties: {
          id,
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
        required: ["id", "name", "health", "speed", "moves"],
        properties: {
          id,
          name: visibleText,
          health: { type: "integer", minimum: 1 },
          speed: { type: "integer", minimum: 1 },
          moves: { type: "array", minItems: 1, uniqueItems: true, items: id }
        }
      }
    },
    encounters: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "creature"],
        properties: { id, creature: id }
      }
    },
    trainers: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "party", "encounter"],
        properties: {
          id,
          name: visibleText,
          party: { type: "array", minItems: 1, items: id },
          encounter: id
        }
      }
    },
    quests: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "titleKey", "summaryKey", "startsAt", "completesAt"],
        properties: {
          id,
          titleKey: id,
          summaryKey: id,
          startsAt: id,
          completesAt: id
        }
      }
    },
    inventory: {
      type: "object",
      propertyNames: contextKey,
      additionalProperties: { type: "integer", minimum: 0 }
    }
  }
};

export const creatorLocaleSchema = {
  $id: "https://lumenjs.dev/experimental/creator-locale-v1.json",
  type: "object",
  minProperties: 1,
  propertyNames: id,
  additionalProperties: visibleText
};

export const creatorContextContributionSchema = {
  $id: "https://lumenjs.dev/experimental/context-contribution-v1.json",
  type: "object",
  additionalProperties: false,
  required: ["format", "values"],
  properties: {
    format: { const: "lumen-context-contribution-v1-experimental" },
    values: {
      type: "object",
      minProperties: 1,
      propertyNames: contextKey,
      additionalProperties: true
    }
  }
};
