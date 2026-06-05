import { buildCtPlanningViewerBridgeAuditRecord, type CtPlanningViewerBridgeAuditRecord } from "./ctPlanningViewerBridgeAudit";
import {
  buildCtPlanningViewerBridgeLaunchGate,
  buildCtPlanningViewerBridgeLaunchPayload,
  type CtPlanningViewerBridgeAdapterTarget,
  type CtPlanningViewerBridgeLaunchGate,
  type CtPlanningViewerBridgeLaunchPayload,
  type CtPlanningViewerBridgePixelPolicy
} from "./ctPlanningViewerBridgeLaunch";
import {
  buildCtPlanningViewerBridgeManifest,
  type CtPlanningViewerBridgeApplyStep,
  type CtPlanningViewerBridgeApplyTarget,
  type CtPlanningViewerBridgeManifest,
  type CtPlanningViewerRestoreCommand
} from "./ctPlanningViewerRestore";

export type CtPlanningViewerBridgeEnvelope = {
  version: "dental-crm-ct-viewer-bridge-envelope-v1";
  target: CtPlanningViewerBridgeAdapterTarget;
  pixelPolicy: CtPlanningViewerBridgePixelPolicy;
  runtimeTruthPolicy: CtPlanningViewerBridgeRuntimeTruthPolicy;
  canLaunch: boolean;
  gateStatus: CtPlanningViewerBridgeLaunchGate["status"];
  commandString: string;
  applySteps: CtPlanningViewerBridgeApplyStep[];
  missingTargets: CtPlanningViewerBridgeApplyTarget[];
  blocker: string | null;
  auditVersion: CtPlanningViewerBridgeAuditRecord["version"];
};

export type CtPlanningViewerBridgeRuntimeTruthPolicy = {
  version: "dental-crm-ct-runtime-truth-v1";
  sourceMode: string;
  executionLane: string;
  memoryBudgetClass: string;
  hardwareQualityWeight: number;
  progressiveSliceWindowCap: number;
  targetSliceBatch: number;
  estimatedGpuMemoryMb: number;
  diagnosticPixelPolicy: string;
  containsDiagnosticPixels: false;
  containsMeshGeometry: false;
  browserStoresHeavyGeometry: false;
  heavyDataOwner: "external_viewer_or_local_3d_module";
  summary: string;
};

export type CtPlanningViewerBridgeHandoff = {
  version: "dental-crm-ct-viewer-bridge-handoff-v1";
  manifest: CtPlanningViewerBridgeManifest;
  launchPayload: CtPlanningViewerBridgeLaunchPayload;
  launchGate: CtPlanningViewerBridgeLaunchGate;
  auditRecord: CtPlanningViewerBridgeAuditRecord;
  envelope: CtPlanningViewerBridgeEnvelope;
  envelopeString: string;
};

export function serializeCtPlanningViewerBridgeEnvelope(envelope: CtPlanningViewerBridgeEnvelope): string {
  return JSON.stringify(envelope);
}

function defaultRuntimeTruthPolicy(pixelPolicy: CtPlanningViewerBridgePixelPolicy): CtPlanningViewerBridgeRuntimeTruthPolicy {
  return {
    version: "dental-crm-ct-runtime-truth-v1",
    sourceMode: "server_or_uploaded_copy",
    executionLane: pixelPolicy === "metadata_only_no_pixels" ? "metadata_only_no_pixels" : "desktop_app_or_external_diagnostic",
    memoryBudgetClass: "minimum",
    hardwareQualityWeight: 0,
    progressiveSliceWindowCap: 1,
    targetSliceBatch: 1,
    estimatedGpuMemoryMb: 0,
    diagnosticPixelPolicy: pixelPolicy === "metadata_only_no_pixels" ? "metadata_only_no_pixels" : "desktop_app_or_external_review",
    containsDiagnosticPixels: false,
    containsMeshGeometry: false,
    browserStoresHeavyGeometry: false,
    heavyDataOwner: "external_viewer_or_local_3d_module",
    summary: "CRM bridge envelope carries planning metadata only; heavy CT pixels and 3D geometry stay outside the browser CRM."
  };
}

export function buildCtPlanningViewerBridgeHandoff(input: {
  commands: readonly CtPlanningViewerRestoreCommand[];
  requiresVolume: boolean;
  volumeReady: boolean;
  viewLabel: string;
  windowLabel: string;
  slabMm: number;
  target?: CtPlanningViewerBridgeAdapterTarget;
  runtimeTruthPolicy?: CtPlanningViewerBridgeRuntimeTruthPolicy;
}): CtPlanningViewerBridgeHandoff {
  const manifest = buildCtPlanningViewerBridgeManifest({
    commands: input.commands,
    requiresVolume: input.requiresVolume,
    volumeReady: input.volumeReady,
    viewLabel: input.viewLabel,
    windowLabel: input.windowLabel,
    slabMm: input.slabMm
  });
  const launchPayload = buildCtPlanningViewerBridgeLaunchPayload({
    manifest,
    commandString: manifest.commandString,
    ...(input.target ? { target: input.target } : {})
  });
  const launchGate = buildCtPlanningViewerBridgeLaunchGate(launchPayload);
  const auditRecord = buildCtPlanningViewerBridgeAuditRecord({ payload: launchPayload, gate: launchGate });
  const runtimeTruthPolicy = input.runtimeTruthPolicy ?? defaultRuntimeTruthPolicy(launchPayload.pixelPolicy);
  const envelope: CtPlanningViewerBridgeEnvelope = {
    version: "dental-crm-ct-viewer-bridge-envelope-v1",
    target: launchPayload.target,
    pixelPolicy: launchPayload.pixelPolicy,
    runtimeTruthPolicy,
    canLaunch: launchGate.canLaunch,
    gateStatus: launchGate.status,
    commandString: launchPayload.commandString,
    applySteps: launchPayload.applySteps,
    missingTargets: launchGate.missingTargets,
    blocker: launchGate.blocker,
    auditVersion: auditRecord.version
  };
  return {
    version: "dental-crm-ct-viewer-bridge-handoff-v1",
    manifest,
    launchPayload,
    launchGate,
    auditRecord,
    envelope,
    envelopeString: serializeCtPlanningViewerBridgeEnvelope(envelope)
  };
}
