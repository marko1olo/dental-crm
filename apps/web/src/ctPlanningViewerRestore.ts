import type { DicomMprProjection, ImagingViewerWindowPreset } from "@dental/shared";

export type CtPlanningViewerRestoreWindowPreset = Extract<ImagingViewerWindowPreset, "bone" | "soft_tissue" | "implant" | "custom">;

export type CtPlanningViewerRestoreInput = {
  projection: DicomMprProjection;
  windowPreset: CtPlanningViewerRestoreWindowPreset;
  slabMm: number;
  requiresVolume: boolean;
};

export type CtPlanningViewerRestoreMode = "load_volume" | "metadata_only";

export type CtPlanningViewerRestoreCommand =
  | CtPlanningViewerRestoreMode
  | `projection:${DicomMprProjection}`
  | `window:${CtPlanningViewerRestoreWindowPreset}`
  | `slab:${number}`;

export type CtPlanningViewerRestoreParseResult = {
  valid: boolean;
  commands: CtPlanningViewerRestoreCommand[];
  mode: CtPlanningViewerRestoreMode | null;
  projection: DicomMprProjection | null;
  windowPreset: CtPlanningViewerRestoreWindowPreset | null;
  slabMm: number | null;
  error: string | null;
};

export type CtPlanningViewerBridgeApplyTarget = "volume" | "projection" | "window" | "slab";

export type CtPlanningViewerBridgeApplyStep = {
  id: string;
  target: CtPlanningViewerBridgeApplyTarget;
  command: CtPlanningViewerRestoreCommand;
  value: string;
  required: boolean;
};

export type CtPlanningViewerBridgeApplyPlan = {
  valid: boolean;
  steps: CtPlanningViewerBridgeApplyStep[];
  stepCount: number;
  error: string | null;
};

export type CtPlanningViewerBridgeStatus = "ready" | "metadata_only" | "blocked";

export type CtPlanningViewerBridgeManifest = {
  status: CtPlanningViewerBridgeStatus;
  statusLabel: string;
  adapterLabel: string;
  commandString: string;
  commandCount: number;
  applyStepCount: number;
  restoreValid: boolean;
  parseError: string | null;
  blocker: string | null;
};

const projectionValues = new Set<DicomMprProjection>([
  "axial",
  "coronal",
  "sagittal",
  "oblique",
  "panoramic_reconstruction",
  "three_d_volume",
  "mip"
]);

const windowPresetValues = new Set<CtPlanningViewerRestoreWindowPreset>(["bone", "soft_tissue", "implant", "custom"]);

function isCtPlanningViewerRestoreMode(value: string): value is CtPlanningViewerRestoreMode {
  return value === "load_volume" || value === "metadata_only";
}

function isDicomMprProjection(value: string): value is DicomMprProjection {
  return projectionValues.has(value as DicomMprProjection);
}

function isCtPlanningViewerRestoreWindowPreset(value: string): value is CtPlanningViewerRestoreWindowPreset {
  return windowPresetValues.has(value as CtPlanningViewerRestoreWindowPreset);
}

export function buildCtPlanningViewerRestoreCommands(input: CtPlanningViewerRestoreInput): CtPlanningViewerRestoreCommand[] {
  return [
    input.requiresVolume ? "load_volume" : "metadata_only",
    `projection:${input.projection}`,
    `window:${input.windowPreset}`,
    `slab:${input.slabMm}`
  ];
}

export function serializeCtPlanningViewerRestoreCommands(commands: readonly CtPlanningViewerRestoreCommand[]) {
  return commands.join("|");
}

function invalidRestoreCommandString(error: string): CtPlanningViewerRestoreParseResult {
  return {
    valid: false,
    commands: [],
    mode: null,
    projection: null,
    windowPreset: null,
    slabMm: null,
    error
  };
}

export function parseCtPlanningViewerRestoreCommandString(commandString: string): CtPlanningViewerRestoreParseResult {
  const tokens = commandString.split("|").filter(Boolean);
  if (tokens.length !== 4) return invalidRestoreCommandString("restore command string must contain exactly 4 commands");

  const modeToken = tokens[0] ?? "";
  const projectionToken = tokens[1] ?? "";
  const windowToken = tokens[2] ?? "";
  const slabToken = tokens[3] ?? "";
  if (!isCtPlanningViewerRestoreMode(modeToken)) return invalidRestoreCommandString("restore command mode must be load_volume or metadata_only");
  if (!projectionToken.startsWith("projection:")) return invalidRestoreCommandString("restore command projection token is missing");
  if (!windowToken.startsWith("window:")) return invalidRestoreCommandString("restore command window token is missing");
  if (!slabToken.startsWith("slab:")) return invalidRestoreCommandString("restore command slab token is missing");

  const projection = projectionToken.slice("projection:".length);
  if (!isDicomMprProjection(projection)) return invalidRestoreCommandString("restore command projection is unsupported");

  const windowPreset = windowToken.slice("window:".length);
  if (!isCtPlanningViewerRestoreWindowPreset(windowPreset)) return invalidRestoreCommandString("restore command window preset is unsupported");

  const slabMm = Number(slabToken.slice("slab:".length));
  if (!Number.isFinite(slabMm) || slabMm <= 0) return invalidRestoreCommandString("restore command slab must be a positive number");

  return {
    valid: true,
    commands: [modeToken, `projection:${projection}`, `window:${windowPreset}`, `slab:${slabMm}`],
    mode: modeToken,
    projection,
    windowPreset,
    slabMm,
    error: null
  };
}

export function buildCtPlanningViewerBridgeApplyPlan(commandString: string): CtPlanningViewerBridgeApplyPlan {
  const parsed = parseCtPlanningViewerRestoreCommandString(commandString);
  if (!parsed.valid || !parsed.mode || !parsed.projection || !parsed.windowPreset || parsed.slabMm === null) {
    return { valid: false, steps: [], stepCount: 0, error: parsed.error };
  }

  const steps: CtPlanningViewerBridgeApplyStep[] = [
    { id: "volume-mode", target: "volume", command: parsed.mode, value: parsed.mode, required: parsed.mode === "load_volume" },
    {
      id: "projection",
      target: "projection",
      command: `projection:${parsed.projection}`,
      value: parsed.projection,
      required: true
    },
    {
      id: "window",
      target: "window",
      command: `window:${parsed.windowPreset}`,
      value: parsed.windowPreset,
      required: true
    },
    {
      id: "slab",
      target: "slab",
      command: `slab:${parsed.slabMm}`,
      value: String(parsed.slabMm),
      required: true
    }
  ];

  return { valid: true, steps, stepCount: steps.length, error: null };
}

export function buildCtPlanningViewerBridgeManifest(input: {
  commands: readonly CtPlanningViewerRestoreCommand[];
  requiresVolume: boolean;
  volumeReady: boolean;
  viewLabel: string;
  windowLabel: string;
  slabMm: number;
}): CtPlanningViewerBridgeManifest {
  const commandString = serializeCtPlanningViewerRestoreCommands(input.commands);
  const parsed = parseCtPlanningViewerRestoreCommandString(commandString);
  const applyPlan = buildCtPlanningViewerBridgeApplyPlan(commandString);
  const adapterLabel = `${input.viewLabel} \u00b7 ${input.windowLabel} \u00b7 ${input.slabMm} \u043c\u043c \u00b7 ${input.commands.length} \u043a\u043e\u043c\u0430\u043d\u0434`;
  if (!parsed.valid) {
    return {
      status: "blocked",
      statusLabel: "пакет просмотра: ошибка команд",
      adapterLabel,
      commandString,
      commandCount: input.commands.length,
      applyStepCount: applyPlan.stepCount,
      restoreValid: false,
      parseError: parsed.error,
      blocker: parsed.error
    };
  }
  if (input.requiresVolume && !input.volumeReady) {
    return {
      status: "blocked",
      statusLabel: "пакет просмотра: нужен объем КТ",
      adapterLabel,
      commandString,
      commandCount: input.commands.length,
      applyStepCount: applyPlan.stepCount,
      restoreValid: true,
      parseError: null,
      blocker: "\u043d\u0435\u0442 \u0433\u043e\u0442\u043e\u0432\u043e\u0439 \u043e\u0431\u044a\u0435\u043c\u043d\u043e\u0439 \u0441\u0435\u0440\u0438\u0438"
    };
  }
  if (!input.requiresVolume) {
    return {
      status: "metadata_only",
      statusLabel: "пакет просмотра: без объема",
      adapterLabel,
      commandString,
      commandCount: input.commands.length,
      applyStepCount: applyPlan.stepCount,
      restoreValid: true,
      parseError: null,
      blocker: null
    };
  }
  return {
    status: "ready",
    statusLabel: "пакет просмотра: объем восстановим",
    adapterLabel,
    commandString,
    commandCount: input.commands.length,
    applyStepCount: applyPlan.stepCount,
    restoreValid: true,
    parseError: null,
    blocker: null
  };
}
