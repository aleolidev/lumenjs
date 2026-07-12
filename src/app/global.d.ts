interface Window {
  firstLight: {
    project: Record<string, unknown>;
    world: Record<string, unknown>;
    readonly state: FirstLightState;
    readonly campaignState: ContinuityState;
    diagnostics: FirstLightDiagnostics;
    dispatch(action: string): unknown;
    campaignDispatch(action: Record<string, unknown>): unknown;
    saveJourney(): Promise<unknown>;
    loadJourney(): Promise<LoadResult | null>;
    exportJourney(options?: { download?: boolean }): Promise<ExportResult>;
    prepareImport(value: unknown): Promise<Record<string, unknown>>;
    confirmImport(): Promise<Record<string, unknown>>;
    inspectStore(): Promise<StoreInspection>;
    corruptCurrentForTest(kind?: "checksum" | "missing"): Promise<void>;
    settled(): Promise<void>;
  };
}

interface FirstLightState {
  flags: Record<string, boolean>;
  transitions: number;
  [key: string]: unknown;
}

interface ContinuityState {
  activeMapId: string;
  mapStates: Record<string, FirstLightState>;
  party: string[];
  [key: string]: unknown;
}

interface StoreInspection {
  pointer: { generation: number; [key: string]: unknown } | null;
  generations: Array<{ generation: number; [key: string]: unknown }>;
}

interface LoadResult {
  recovered: boolean;
  [key: string]: unknown;
}

interface ExportResult {
  envelope: { snapshot: ContinuityState; [key: string]: unknown };
  json: string;
  filename: string;
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
    campaign: ContinuityState;
    stateHash: string;
    recentFacts: Array<{ type: string; [key: string]: unknown }>;
  };
  continuity: { activeMapId: string; visitedMaps: string[] };
  storage: {
    lastResult: {
      recovered?: boolean;
      failures?: Array<{ reason: string; [key: string]: unknown }>;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  };
  scene: {
    itemCount: number;
    [key: string]: unknown;
  };
  renderer: {
    status: string;
    reason?: string | null;
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
