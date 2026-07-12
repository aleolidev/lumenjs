import { validateCreatorProject } from "./validate-project.js";

export async function inspectCreatorProject(directory) {
  const validation = await validateCreatorProject(directory);
  if (!validation.valid || !validation.project) return { ...validation, summary: null };
  const { manifest, loaded, declared } = validation.project;
  const campaign = loaded[manifest.sources.campaign];
  const localeConfig = manifest.sources.locales;
  const locales = localeConfig
    ? {
        default: localeConfig.default,
        ids: Object.keys(localeConfig.catalogs).sort(),
        keys: Object.keys(loaded[localeConfig.catalogs[localeConfig.default]]).length
      }
    : { default: "inline", ids: ["inline"], keys: Object.keys(campaign.messages).length };
  const maps = manifest.sources.maps.map((entry) => {
    const map = loaded[entry.map];
    const world = loaded[entry.world];
    return {
      id: entry.id,
      mapSource: entry.map,
      worldSource: entry.world,
      width: map.width,
      height: map.height,
      defaultSpawn: world.defaultSpawn,
      spawns: world.spawns.map((item) => item.id).sort(),
      transitions: world.transitions
        .map((item) => ({ id: item.id, targetMap: item.targetMap, targetSpawn: item.targetSpawn }))
        .sort((left, right) => compareText(left.id, right.id)),
      characters: world.characters.map((item) => item.id).sort()
    };
  });
  return {
    valid: true,
    diagnostics: [],
    summary: {
      format: "lumen-creator-inspection-v1-experimental",
      project: {
        id: manifest.projectId,
        title: manifest.title,
        version: manifest.version,
        startMap: manifest.startMap
      },
      declaredFiles: [
        ...new Set(
          declared
            .filter(([kind, relative]) => kind !== "optional-context" || Boolean(loaded[relative]))
            .map(([, relative]) => relative)
        )
      ].sort(),
      maps,
      graph: maps.flatMap((map) =>
        map.transitions.map((transition) => ({
          fromMap: map.id,
          transition: transition.id,
          toMap: transition.targetMap,
          toSpawn: transition.targetSpawn
        }))
      ),
      campaign: {
        messages: locales.keys,
        dialogueNodes: campaign.dialogue.nodes.length,
        moves: campaign.moves.length,
        creatures: campaign.creatures.length,
        encounters: campaign.encounters.length,
        trainers: campaign.trainers.length,
        quests: campaign.quests.length,
        inventoryItems: Object.keys(campaign.inventory).length
      },
      trainers: campaign.trainers
        .map((trainer) => ({
          id: trainer.id,
          party: [...trainer.party],
          encounter: trainer.encounter
        }))
        .sort((left, right) => compareText(left.id, right.id)),
      quests: campaign.quests
        .map((quest) => ({
          id: quest.id,
          startsAt: quest.startsAt,
          completesAt: quest.completesAt,
          titleKey: quest.titleKey,
          summaryKey: quest.summaryKey
        }))
        .sort((left, right) => compareText(left.id, right.id)),
      locales,
      context: validation.project.context,
      provenance: manifest.sources.provenance,
      compatibility: {
        policy: "experimental-no-compatibility-promise",
        projectManifest: { source: "project.lumen.json", schemaVersion: manifest.schemaVersion },
        maps: manifest.sources.maps.map((entry) => ({
          source: entry.map,
          format: loaded[entry.map].type,
          version: loaded[entry.map].version,
          tiledVersion: loaded[entry.map].tiledversion
        })),
        worlds: manifest.sources.maps.map((entry) => ({
          source: entry.world,
          schemaVersion: loaded[entry.world].schemaVersion
        })),
        campaign: {
          source: manifest.sources.campaign,
          schemaVersion: campaign.schemaVersion
        },
        locales: localeConfig
          ? Object.entries(localeConfig.catalogs)
              .map(([id, source]) => ({ id, source, schemaVersion: null }))
              .sort((left, right) => compareText(left.id, right.id))
          : [],
        contextContributions: (manifest.sources.contextModules ?? []).map((entry) => ({
          id: entry.id,
          source: entry.source,
          declarationVersion: entry.version,
          sourceFormat: loaded[entry.source]?.format ?? null,
          optional: entry.optional ?? false,
          present: Boolean(loaded[entry.source])
        }))
      }
    }
  };
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
