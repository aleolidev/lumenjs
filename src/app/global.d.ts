interface Window {
  firstLight: {
    world: Record<string, unknown>;
    readonly state: FirstLightState;
    readonly campaignState: Record<string, unknown>;
    diagnostics: FirstLightDiagnostics;
    dispatch(action: string): unknown;
    campaignDispatch(action: Record<string, unknown>): unknown;
    settled(): Promise<void>;
  };
}

interface FirstLightState {
  flags: Record<string, boolean>;
  transitions: number;
  [key: string]: unknown;
}

interface FirstLightDiagnostics {
  project: {
    id: string;
    version: string;
    schemaVersion: number;
    mapId: string;
  };
  input: string | null;
  simulation: {
    state: FirstLightState;
    campaign: Record<string, unknown>;
    stateHash: string;
    recentFacts: Array<{ type: string; [key: string]: unknown }>;
  };
  scene: {
    itemCount: number;
    [key: string]: unknown;
  };
  renderer: {
    status: string;
    projection?: string;
    visualMode?: string;
    textures?: string[];
    drawCalls: number;
    vertices: number;
    uploadBytes: number;
    submittedFrames: number;
    medianFrameMs?: number;
    medianCpuSceneAndSubmitMs?: number;
    gpuErrors?: string[];
  };
}
