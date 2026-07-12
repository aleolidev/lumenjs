export function resolveEncounterContext(contributions) {
  const values = Object.create(null);
  const ownership = Object.create(null);
  const applied = [];
  for (const contribution of contributions) {
    for (const key of Object.keys(contribution.values).sort()) {
      const value = contribution.values[key];
      if (Object.hasOwn(ownership, key)) {
        throw new EncounterContextError(
          "CREATOR_CONTEXT_OWNER_CONFLICT",
          contribution.source,
          key,
          ownership[key]
        );
      }
      values[key] = sortValue(structuredClone(value));
      ownership[key] = { module: contribution.module, source: contribution.source };
    }
    applied.push({ module: contribution.module, source: contribution.source, version: 1 });
  }
  const meaning = { values, ownership, applied };
  return {
    format: "lumen-encounter-context-v1-experimental",
    ...meaning,
    hash: hash(meaning)
  };
}

export class EncounterContextError extends Error {
  constructor(code, source, key, previous) {
    super(`Context key '${key}' is already owned by '${previous.module}'.`);
    this.name = "EncounterContextError";
    this.code = code;
    this.source = source;
    this.key = key;
    this.previous = previous;
    this.remedy = "Assign one owner per context key or use distinct namespaced keys.";
  }
}

function hash(value) {
  const text = JSON.stringify(sortValue(value));
  let result = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 0x01000193) >>> 0;
  }
  return `fnv1a32-v1:${result.toString(16).padStart(8, "0")}`;
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortValue(value[key])])
    );
  }
  return value;
}
