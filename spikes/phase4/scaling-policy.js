export function resolveAuthoredThreat(regions, regionId, milestone) {
  const region = regions.find((item) => item.id === regionId);
  if (!region) throw new Error(`Unknown authored region '${regionId}'`);
  if (!Number.isInteger(milestone) || milestone < 0)
    throw new Error("Campaign milestone must be a non-negative integer");
  const band = [...region.bands]
    .sort((left, right) => left.fromMilestone - right.fromMilestone)
    .filter((item) => item.fromMilestone <= milestone)
    .at(-1);
  if (!band) throw new Error(`Region '${regionId}' has no threat band for milestone ${milestone}`);
  return {
    regionId,
    milestone,
    threat: band.threat,
    encounterLevel: band.level,
    sourceBand: band.id
  };
}
