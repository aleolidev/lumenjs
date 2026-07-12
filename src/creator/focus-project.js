import {
  buildCreatorPlaytestModel,
  createFocusedPlaytestState,
  hashCreatorPlaytestState
} from "./playtest-simulation.js";
import { validateCreatorProject } from "./validate-project.js";

export async function focusCreatorProject(directory, focus = {}) {
  const validation = await validateCreatorProject(directory);
  if (!validation.valid || !validation.project) {
    return { valid: false, diagnostics: validation.diagnostics, focus: null };
  }
  try {
    const model = buildCreatorPlaytestModel(
      validation.project.manifest,
      validation.project.loaded,
      validation.project.context.resolved
    );
    const state = createFocusedPlaytestState(model, focus);
    const resolved = {
      map: state.activeMapId,
      spawn:
        focus.spawn ??
        validation.project.loaded[
          validation.project.manifest.sources.maps.find((entry) => entry.id === state.activeMapId)
            .world
        ].defaultSpawn,
      locale: state.locale
    };
    return {
      valid: true,
      diagnostics: [],
      focus: {
        format: "lumen-creator-focus-v1-experimental",
        projectId: model.projectId,
        ...resolved,
        query: `?${new URLSearchParams(resolved).toString()}`,
        state,
        stateHash: hashCreatorPlaytestState(state),
        context: model.context
      }
    };
  } catch (error) {
    if (error && typeof error === "object" && "diagnostics" in error) {
      return { valid: false, diagnostics: error.diagnostics, focus: null };
    }
    throw error;
  }
}
