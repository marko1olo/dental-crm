import type {
  CtPlanningViewerBridgeAdapterTarget,
  CtPlanningViewerBridgeLaunchGate,
  CtPlanningViewerBridgeLaunchGateStatus,
  CtPlanningViewerBridgeLaunchPayload,
  CtPlanningViewerBridgePixelPolicy
} from "./ctPlanningViewerBridgeLaunch";

export type CtPlanningViewerBridgeAuditRecord = {
  version: "dental-crm-ct-viewer-bridge-audit-v1";
  target: CtPlanningViewerBridgeAdapterTarget;
  gateStatus: CtPlanningViewerBridgeLaunchGateStatus;
  canLaunch: boolean;
  pixelPolicy: CtPlanningViewerBridgePixelPolicy;
  applyStepCount: number;
  missingTargetCount: number;
  blocker: string | null;
  restoreCommandString: string;
};

export function buildCtPlanningViewerBridgeAuditRecord(input: {
  payload: CtPlanningViewerBridgeLaunchPayload;
  gate: CtPlanningViewerBridgeLaunchGate;
}): CtPlanningViewerBridgeAuditRecord {
  return {
    version: "dental-crm-ct-viewer-bridge-audit-v1",
    target: input.payload.target,
    gateStatus: input.gate.status,
    canLaunch: input.gate.canLaunch,
    pixelPolicy: input.payload.pixelPolicy,
    applyStepCount: input.payload.applySteps.length,
    missingTargetCount: input.gate.missingTargets.length,
    blocker: input.gate.blocker,
    restoreCommandString: input.payload.commandString
  };
}
