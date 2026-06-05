import {
  buildCtPlanningViewerBridgeApplyPlan,
  type CtPlanningViewerBridgeApplyStep,
  type CtPlanningViewerBridgeApplyTarget,
  type CtPlanningViewerBridgeManifest,
  type CtPlanningViewerBridgeStatus
} from "./ctPlanningViewerRestore";

export type CtPlanningViewerBridgeAdapterTarget = "ohif" | "cornerstone" | "local_bridge";
export type CtPlanningViewerBridgePixelPolicy = "external_volume_only" | "metadata_only_no_pixels";
export type CtPlanningViewerBridgeLaunchGateStatus = "volume_ready" | "metadata_ready" | "blocked";

export type CtPlanningViewerBridgeLaunchPayload = {
  target: CtPlanningViewerBridgeAdapterTarget;
  status: CtPlanningViewerBridgeStatus;
  pixelPolicy: CtPlanningViewerBridgePixelPolicy;
  commandString: string;
  applySteps: CtPlanningViewerBridgeApplyStep[];
  blocker: string | null;
};

export type CtPlanningViewerBridgeLaunchGate = {
  status: CtPlanningViewerBridgeLaunchGateStatus;
  canLaunch: boolean;
  requiredTargets: CtPlanningViewerBridgeApplyTarget[];
  missingTargets: CtPlanningViewerBridgeApplyTarget[];
  blocker: string | null;
};

const metadataLaunchTargets: CtPlanningViewerBridgeApplyTarget[] = ["projection", "window", "slab"];
const volumeLaunchTargets: CtPlanningViewerBridgeApplyTarget[] = ["volume", ...metadataLaunchTargets];

export function buildCtPlanningViewerBridgeLaunchPayload(input: {
  manifest: CtPlanningViewerBridgeManifest;
  commandString: string;
  target?: CtPlanningViewerBridgeAdapterTarget;
}): CtPlanningViewerBridgeLaunchPayload {
  const applyPlan = buildCtPlanningViewerBridgeApplyPlan(input.commandString);
  const blocker = input.manifest.blocker ?? applyPlan.error ?? null;
  return {
    target: input.target ?? "local_bridge",
    status: blocker || !applyPlan.valid ? "blocked" : input.manifest.status,
    pixelPolicy: input.manifest.status === "metadata_only" ? "metadata_only_no_pixels" : "external_volume_only",
    commandString: input.commandString,
    applySteps: applyPlan.steps,
    blocker
  };
}

export function buildCtPlanningViewerBridgeLaunchGate(payload: CtPlanningViewerBridgeLaunchPayload): CtPlanningViewerBridgeLaunchGate {
  const requiredTargets = payload.pixelPolicy === "external_volume_only" ? volumeLaunchTargets : metadataLaunchTargets;
  const presentTargets = new Set(payload.applySteps.filter((step) => step.required).map((step) => step.target));
  const missingTargets = requiredTargets.filter((target) => !presentTargets.has(target));
  const blocker = payload.blocker ?? (missingTargets.length > 0 ? `не хватает шагов восстановления: ${missingTargets.join(",")}` : null);
  return {
    status: blocker ? "blocked" : payload.pixelPolicy === "metadata_only_no_pixels" ? "metadata_ready" : "volume_ready",
    canLaunch: !blocker,
    requiredTargets,
    missingTargets,
    blocker
  };
}
