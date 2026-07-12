const slots = ["identity", "body", "marking", "temperament", "moves"];

export function resolveCreatureComposition(components) {
  const bySlot = {};
  for (const component of components) {
    if (!slots.includes(component.slot))
      throw new Error(`Unknown creature component slot '${component.slot}'`);
    if (bySlot[component.slot])
      throw new Error(`Creature slot '${component.slot}' has multiple owners`);
    bySlot[component.slot] = component;
  }
  for (const slot of slots)
    if (!bySlot[slot]) throw new Error(`Creature slot '${slot}' is missing`);
  return {
    format: "lumen-creature-composition-v1-spike",
    id: bySlot.identity.value.id,
    name: bySlot.identity.value.name,
    presentation: {
      body: structuredClone(bySlot.body.value),
      marking: structuredClone(bySlot.marking.value)
    },
    temperament: structuredClone(bySlot.temperament.value),
    moves: structuredClone(bySlot.moves.value),
    provenance: Object.fromEntries(
      slots.map((slot) => [slot, { module: bySlot[slot].module, source: bySlot[slot].source }])
    )
  };
}
