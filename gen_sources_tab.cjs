const fs = require('fs');

const sourcesContent = fs.readFileSync('sources_blocks.txt', 'utf8');

const imports = `import type {
	CbctWorkbenchPlane,
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	MprClinicalPreset,
	MprWindowPreset,
	StringTokenGroup,
} from "@dental/shared";
import {
	ClipboardCheck,
	Database,
	History,
	ImageIcon,
	Layers3,
	RefreshCw,
	RotateCcw,
	ScanSearch,
} from "lucide-react";
import type { ChangeEvent } from "react";
import React from "react";
import { CtPlanningToolsPanel } from "./CtPlanningToolsPanel";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
`;

const tabTemplate = `${imports}

export function SettingsSourcesTab() {
	const props = useAppLogicContext();
	const {
		imagingConnectorCards,
		imagingSourceLabels,
		imagingViewerCapabilities,
		previewDicomSeries,
		isDicomSeriesPreviewLoading,
		dicomSeriesPreview,
		imagingKindLabels,
		dicomSeriesViewerLabels,
		dicomSeriesDisplayText,
		dicomSeriesWarningText,
		mprLoadStrategyLabels,
		mprResourceTierLabels,
		cbctWorkbenchSeries,
		mprClinicalNextStep,
		mprClinicalChecklist,
		mprOperatorSummaryCards,
		mprControlsReady,
		imagingViewerActiveTool,
		ctPlanningActiveQuickActionId,
		applyCtPlanningQuickAction,
		ctPlanningImplantPlan,
		selectCtPlanningImplantFromSettings,
		dicomViewerWorkbenchManifest,
		dicomViewerToolStateBundle,
		activeDentalModelWorkbenchManifest,
		localBridgeReadiness,
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		mprSeriesRequiredProjectionLabel,
		mprUnavailableProjectionLabel,
		mprProjection,
		setMprProjection,
		mprAxisVisualizerStyle,
		mprAxisVisualizerLabel,
		handleMprKeyboardNavigation,
		mprProjectionCompass,
		mprCrosshairEnabled,
		mprAxisAngleBadge,
		mprSlabBadge,
		mprSliceBadge,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprAxisDirectionLabel,
		mprSlabMm,
		mprSliceLabel,
		mprAxisGuidance,
		mprWorkbenchSummaryText,
		mprLinkedPlanesEnabled,
		mprNearestClinicalPreset,
		applyNearestMprClinicalPreset,
		mprProjectionLabels,
		mprAxisDeg,
		mprAxisRangeValue,
		mprAxisBounds,
		setMprAxisDeg,
		clampMprAxisDeg,
		mprAxisNudgeDeg,
		formatSignedMprStep,
		mprAxisPresetDeg,
		mprSlabRangeValue,
		mprSlabBounds,
		setMprSlabMm,
		clampMprSlabMm,
		mprSlabNudgeMm,
		mprSlabPresetMm,
		mprSliceMaxIndex,
		mprSafeSliceIndex,
		mprSliceRangeValue,
		setMprSliceIndex,
		clampMprSliceIndex,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprSliceIndexFromFraction,
		resetMprControls,
		mprWorkbenchLocalSavedAt,
		formatTime,
		mprWorkbenchDraftRestored,
		restoreMprWorkbenchLocalDraft,
		mprClinicalPresets,
		describeMprClinicalPresetProjectionFallback,
		mprClinicalPresetButtonClass,
		applyMprClinicalPreset,
		mprWindowPresetLabels,
		mprWindowPreset,
		setMprWindowPreset,
		setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled,
		cbctWorkbenchTools,
		mprToolLabels,
		cbctMprBlockers,
		cbctMprWarnings,
		mprCacheModeLabels,
		cbctResourceSafetyCaps,
		testDicomWorkstationReadiness,
		isDicomWorkstationReadinessTesting,
		dicomWorkstationReadiness,
		dicomLabel,
		dicomExecutionLaneLabels,
		dicomRuntimeTierLabels,
		dicomGpuClassLabels,
		dicomQualityModeLabels,
		dicomTextureStrategyLabels,
		dicomRenderMemoryBudgetClassLabels,
		dicomDiagnosticPixelPolicyLabels,
		isDicomToolStateBuilding,
		downloadDicomViewerToolStateBundle,
		integrationPresets,
		applyIntegrationPreset,
		dicomIntegrationProfileLabels
	} = props;

	const typedImagingConnectorCards = imagingConnectorCards as Array<{ title: string; detail: string; source: string; }>;
	const typedImagingViewerCapabilities = imagingViewerCapabilities as Array<{ icon: any; title: string; detail: string; state: string; }>;
	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ?? []) as Array<any>;
	const typedDicomSeriesPreviewParserNotes = (dicomSeriesPreview?.parserNotes ?? []) as Array<string>;
	const typedImagingViewerActiveTool = imagingViewerActiveTool as string;
	const typedCtPlanningActiveQuickActionId = ctPlanningActiveQuickActionId as string | null;
	const typedCtPlanningImplantPlan = ctPlanningImplantPlan as any | null;
	const typedDicomViewerWorkbenchManifest = dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomViewerToolStateBundle = dicomViewerToolStateBundle as any | null;
	const typedLocalBridgeReadiness = localBridgeReadiness as any | null;
	const typedCbctWorkbenchProjections = (cbctWorkbenchProjections ?? []) as string[];
	const typedCbctWorkbenchTools = (cbctWorkbenchTools ?? []) as string[];
	const typedCbctMprBlockers = (cbctMprBlockers ?? []) as string[];
	const typedCbctMprWarnings = (cbctMprWarnings ?? []) as string[];
	const typedCbctResourceSafetyCaps = (cbctResourceSafetyCaps ?? []) as string[];
	const typedDicomWorkstationReadiness = dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const typedIntegrationPresets = (integrationPresets ?? []) as Array<any>;

	return (
		<>
${sourcesContent.replace(/\{settingsTab === "sources" \? \(/g, '').replace(/\n\t\t\t\t\) : null\}/g, '')}
		</>
	);
}
`;

fs.writeFileSync('apps/web/src/components/settings/SettingsSourcesTab.tsx', tabTemplate, 'utf8');

console.log('SettingsSourcesTab created.');
