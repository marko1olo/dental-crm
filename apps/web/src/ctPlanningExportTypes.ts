import type { DicomMprProjection, DicomGpuRenderPlan } from "@dental/shared";
import type { CtPlanningViewerBridgeDataAttributes } from "./ctPlanningViewerBridgeAttributes";
import type { CtPlanningViewerRestoreCommand, CtPlanningViewerRestoreWindowPreset } from "./ctPlanningViewerRestore";

export type CtPlanningExportOwner = "doctor" | "admin" | "lab";
export type CtPlanningExportStatus = "ready" | "warning" | "blocked";

export type CtPlanningExportLane = {
	id: string;
	owner: CtPlanningExportOwner;
	title: string;
	status: CtPlanningExportStatus;
	value: string;
	detail: string;
	nextAction: string;
};

export type CtPlanningExportFact = {
	id: string;
	title: string;
	tone: CtPlanningExportStatus;
	value: string;
	detail: string;
};

export type CtPlanningRuntimeSourceMode =
	| "local_offline_available"
	| "remote_online_required"
	| "server_or_uploaded_copy";
export type CtPlanningRuntimeExecutionLane =
	| "metadata_only_no_pixels"
	| "mobile_or_constrained_preview"
	| "desktop_browser_planning_preview"
	| "desktop_app_or_external_diagnostic";

export type CtPlanningRuntimeTruthPolicy = {
	version: "dental-crm-ct-runtime-truth-v1";
	sourceMode: CtPlanningRuntimeSourceMode;
	executionLane: CtPlanningRuntimeExecutionLane;
	memoryBudgetClass: DicomGpuRenderPlan["memoryBudgetClass"];
	hardwareQualityWeight: number;
	progressiveSliceWindowCap: number;
	targetSliceBatch: number;
	estimatedGpuMemoryMb: number;
	diagnosticPixelPolicy: DicomGpuRenderPlan["diagnosticPixelPolicy"];
	containsDiagnosticPixels: false;
	containsMeshGeometry: false;
	browserStoresHeavyGeometry: false;
	heavyDataOwner: "external_viewer_or_local_3d_module";
	summary: string;
};

export type CtPlanningExportScenarioArtifact = {
	id: string;
	title: string;
	status: "ready" | "draft" | "blocked";
	statusLabel: string;
	blocker: string | null;
};

export type CtPlanningExportScenarioStatusCounts = {
	ready: number;
	draft: number;
	blocked: number;
};

export type CtPlanningExportScenarioIssue = {
	id: string;
	title: string;
	status: "draft" | "blocked";
	blocker: string | null;
};

export type CtPlanningExportScenarioRoute = {
	owner: CtPlanningExportOwner;
	ownerLabel: string;
	deliverable: string;
	confirmation: string;
};

export type CtPlanningExportScenarioViewerPreset = {
	projection: DicomMprProjection;
	viewLabel: string;
	windowPreset: CtPlanningViewerRestoreWindowPreset;
	windowLabel: string;
	slabMm: number;
	requiresVolume: boolean;
	restoreCommands: CtPlanningViewerRestoreCommand[];
};

export type CtPlanningExportScenarioViewerBridge = {
	label: string;
	attrs: CtPlanningViewerBridgeDataAttributes;
};

export type CtPlanningExportScenarioSummary = {
	id: string;
	title: string;
	status: CtPlanningExportStatus;
	route: CtPlanningExportScenarioRoute;
	viewer: CtPlanningExportScenarioViewerPreset;
	bridge: CtPlanningExportScenarioViewerBridge;
	totalCount: number;
	readyCount: number;
	draftCount: number;
	blockedCount: number;
	draftArtifacts: CtPlanningExportScenarioIssue[];
	blockedArtifacts: CtPlanningExportScenarioIssue[];
	detail: string;
	nextAction: string;
};

export type CtPlanningExportPacket = {
	version: "dental-crm-ct-planning-export-v1";
	modelOutputKind: "planning_parameters_only";
	cadExportReady: false;
	surfaceModelRequired: true;
	outputBoundarySummary: string;
	runtimeTruthPolicy: CtPlanningRuntimeTruthPolicy;
	activeQuickActionId: string | null;
	activeScenarioSummary: CtPlanningExportScenarioSummary | null;
	volumeReady: boolean;
	score: number;
	status: CtPlanningExportStatus;
	title: string;
	handoffSummary: string;
	nextAction: string;
	clinicalFacts: CtPlanningExportFact[];
	lanes: CtPlanningExportLane[];
	missingArtifacts: string[];
};
