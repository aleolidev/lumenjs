export const projectSchema = {
  $id: "https://lumenjs.dev/spikes/project.schema.json",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "modules", "maps"],
  properties: {
    schemaVersion: { const: 1 },
    modules: {
      type: "array",
      items: { $ref: "#/$defs/module" },
      uniqueItems: true
    },
    maps: {
      type: "array",
      items: { $ref: "#/$defs/map" }
    }
  },
  $defs: {
    id: { type: "string", pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" },
    module: {
      type: "object",
      additionalProperties: false,
      required: ["id", "version"],
      properties: {
        id: { $ref: "#/$defs/id" },
        version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" }
      }
    },
    map: {
      type: "object",
      additionalProperties: false,
      required: ["id", "events"],
      properties: {
        id: { $ref: "#/$defs/id" },
        events: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind"],
            properties: {
              id: { $ref: "#/$defs/id" },
              kind: { type: "string" },
              target: { $ref: "#/$defs/id" }
            }
          }
        }
      }
    }
  }
};

export const questModuleSchema = {
  $id: "https://lumenjs.dev/spikes/quest-module.schema.json",
  type: "object",
  additionalProperties: false,
  required: ["quests"],
  properties: {
    quests: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "startEvent"],
        properties: {
          id: { type: "string", pattern: "^[a-z][a-z0-9-]*$" },
          startEvent: { type: "string", pattern: "^[a-z][a-z0-9-]*$" }
        }
      }
    }
  }
};
