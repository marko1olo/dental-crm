import type { CtPlanningViewerBridgeHandoff } from "./ctPlanningViewerBridgeHandoff";

export type CtPlanningViewerBridgeDataAttributes = {
  "data-viewer-audit-version": CtPlanningViewerBridgeHandoff["auditRecord"]["version"];
  "data-viewer-adapter-target": CtPlanningViewerBridgeHandoff["launchPayload"]["target"];
  "data-viewer-apply-steps": CtPlanningViewerBridgeHandoff["manifest"]["applyStepCount"];
  "data-viewer-bridge-status": CtPlanningViewerBridgeHandoff["manifest"]["status"];
  "data-viewer-can-launch": "true" | "false";
  "data-viewer-envelope-version": CtPlanningViewerBridgeHandoff["envelope"]["version"];
  "data-viewer-bridge-envelope": CtPlanningViewerBridgeHandoff["envelopeString"];
  "data-viewer-launch-gate": CtPlanningViewerBridgeHandoff["launchGate"]["status"];
  "data-viewer-missing-targets": CtPlanningViewerBridgeHandoff["auditRecord"]["missingTargetCount"];
  "data-viewer-pixel-policy": CtPlanningViewerBridgeHandoff["launchPayload"]["pixelPolicy"];
  "data-viewer-runtime-lane": CtPlanningViewerBridgeHandoff["envelope"]["runtimeTruthPolicy"]["executionLane"];
  "data-viewer-runtime-source": CtPlanningViewerBridgeHandoff["envelope"]["runtimeTruthPolicy"]["sourceMode"];
  "data-viewer-hardware-quality-weight": CtPlanningViewerBridgeHandoff["envelope"]["runtimeTruthPolicy"]["hardwareQualityWeight"];
  "data-viewer-slice-window-cap": CtPlanningViewerBridgeHandoff["envelope"]["runtimeTruthPolicy"]["progressiveSliceWindowCap"];
  "data-viewer-browser-heavy-geometry": "true" | "false";
  "data-viewer-restore-valid": "true" | "false";
  "data-viewer-restore": CtPlanningViewerBridgeHandoff["manifest"]["commandString"];
};

function booleanAttribute(value: boolean): "true" | "false" {
  return value ? "true" : "false";
}

export function buildCtPlanningViewerBridgeDataAttributes(
  handoff: CtPlanningViewerBridgeHandoff
): CtPlanningViewerBridgeDataAttributes {
  return {
    "data-viewer-audit-version": handoff.auditRecord.version,
    "data-viewer-adapter-target": handoff.launchPayload.target,
    "data-viewer-apply-steps": handoff.manifest.applyStepCount,
    "data-viewer-bridge-status": handoff.manifest.status,
    "data-viewer-can-launch": booleanAttribute(handoff.launchGate.canLaunch),
    "data-viewer-envelope-version": handoff.envelope.version,
    "data-viewer-bridge-envelope": handoff.envelopeString,
    "data-viewer-launch-gate": handoff.launchGate.status,
    "data-viewer-missing-targets": handoff.auditRecord.missingTargetCount,
    "data-viewer-pixel-policy": handoff.launchPayload.pixelPolicy,
    "data-viewer-runtime-lane": handoff.envelope.runtimeTruthPolicy.executionLane,
    "data-viewer-runtime-source": handoff.envelope.runtimeTruthPolicy.sourceMode,
    "data-viewer-hardware-quality-weight": handoff.envelope.runtimeTruthPolicy.hardwareQualityWeight,
    "data-viewer-slice-window-cap": handoff.envelope.runtimeTruthPolicy.progressiveSliceWindowCap,
    "data-viewer-browser-heavy-geometry": booleanAttribute(handoff.envelope.runtimeTruthPolicy.browserStoresHeavyGeometry),
    "data-viewer-restore-valid": booleanAttribute(handoff.manifest.restoreValid),
    "data-viewer-restore": handoff.manifest.commandString
  };
}
