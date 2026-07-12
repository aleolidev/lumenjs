export function resolveContextContributions(contributions) {
  const values = Object.create(null);
  const ownership = Object.create(null);
  const applied = [];
  for (const contribution of contributions) {
    if (contribution.version !== 1) {
      throw new ContextContributionError(
        "CONTEXT_VERSION_UNSUPPORTED",
        contribution.source,
        `Module '${contribution.module}' uses unsupported version '${contribution.version}'.`
      );
    }
    for (const key of Object.keys(contribution.values).sort()) {
      const value = contribution.values[key];
      if (Object.hasOwn(ownership, key)) {
        throw new ContextContributionError(
          "CONTEXT_OWNER_CONFLICT",
          contribution.source,
          `Context key '${key}' is already owned by '${ownership[key].module}'.`
        );
      }
      values[key] = structuredClone(value);
      ownership[key] = { module: contribution.module, source: contribution.source };
    }
    applied.push({ module: contribution.module, source: contribution.source, version: 1 });
  }
  return {
    format: "lumen-context-resolution-v1-spike",
    values,
    ownership,
    applied,
    hash: hash({ values, ownership, applied })
  };
}

export class ContextContributionError extends Error {
  constructor(code, source, message) {
    super(message);
    this.name = "ContextContributionError";
    this.code = code;
    this.source = source;
    this.remedy =
      code === "CONTEXT_OWNER_CONFLICT"
        ? "Assign one owner per context key or use distinct namespaced keys."
        : "Migrate the contribution to a supported version.";
  }
}

function hash(value) {
  const text = JSON.stringify(value);
  let result = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 0x01000193) >>> 0;
  }
  return `fnv1a32-v1:${result.toString(16).padStart(8, "0")}`;
}
