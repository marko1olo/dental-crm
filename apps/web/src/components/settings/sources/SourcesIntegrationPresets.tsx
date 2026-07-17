
import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	MprWindowPreset,
} from "@dental/shared";
import {
	CheckCircle2,
	ClipboardCheck,
	Database,
	ExternalLink,
	FileText,
	Gauge,
	History,
	ImageIcon,
	Layers3,
	RefreshCw,
	RotateCcw,
	ScanSearch,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { CtPlanningToolsPanel } from "../../ctPlanningTools";

type MprClinicalPreset =
	import("../../mprClinicalStatus").MprClinicalPresetFitTarget;

import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";

type StringTokenGroup = { title: string; items: string[] };
type CbctWorkbenchPlane = { key: string; title: string; detail: string };
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export function SourcesIntegrationPresets() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
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
		dicomIntegrationProfileLabels,
		isDicomRenderCachePlanning,
		dicomWorkstationGuidanceId,
		buildDicomRenderCachePlan,
		buildDicomViewerToolStateBundle,
		isDicomWebChecking,
		dicomArchiveAddressGuidanceId,
		dicomArchiveAddressReady,
		checkDicomWebConnector,
		isDicomManifestBuilding,
		buildDicomViewerLaunchManifest,
		isDicomWorkstationChecking,
		checkDicomWorkstationReadiness,
		isDicomWorkbenchBuilding,
		dicomWorkbenchSeriesGuidanceId,
		buildDicomViewerWorkbenchManifest,
		setOhifBaseUrl,
		ohifBaseUrl,
		setDicomRenderCachePlan,
		setDicomWorkstationReadiness,
		setDicomWorkbenchLocalSavedAt,
		setDicomViewerWorkbenchManifest,
		setDicomViewerToolStateBundle,
		setDicomViewerLaunchManifest,
		setDicomWebCheck,
		setDicomWebEndpointUrl,
		dicomWebEndpointUrl,

		humanizeIntegrationInput,
		integrationCapabilityLabels,
		integrationStatusLabels,
		integrationCategoryLabels,
		humanizeMigrationText,
		dicomViewerLaunchManifest,
		dicomReadinessCheckLabels,
		dicomRenderCachePriorityLabels,
		clearDicomWorkbenchRecovery,
		downloadDicomWorkbenchManifest,
		restoreDicomWorkbenchServerBundle,
		isDicomWorkbenchReconnecting,
		imagingFolderPath,
		reconnectDicomWorkbenchFromCurrentFolder,
		isDicomWorkbenchServerSaving,
		saveDicomWorkbenchBundleToServer,
		dicomWorkbenchSourceIsRedacted,
		dicomWorkbenchServerBundle,
		dicomWorkbenchLocalSavedAt,
		dicomViewerLaunchModeLabels,
		dicomWebStatusLabels,
		dicomWebCheck,
	} = mergedProps;

	const typedImagingConnectorCards = imagingConnectorCards as Array<{
		title: string;
		detail: string;
		source: string;
	}>;
	const typedImagingViewerCapabilities = imagingViewerCapabilities as Array<{
		icon: any;
		title: string;
		detail: string;
		state: string;
	}>;
	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		[]) as Array<any>;
	const typedDicomSeriesPreviewParserNotes = (dicomSeriesPreview?.parserNotes ??
		[]) as Array<string>;
	const typedImagingViewerActiveTool = imagingViewerActiveTool as any;
	const typedCtPlanningActiveQuickActionId = ctPlanningActiveQuickActionId as
		| string
		| null;
	const typedCtPlanningImplantPlan = ctPlanningImplantPlan as any | null;
	const typedDicomViewerWorkbenchManifest =
		dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomViewerToolStateBundle = dicomViewerToolStateBundle as
		| any
		| null;
	const typedLocalBridgeReadiness = localBridgeReadiness as any | null;
	const typedCbctWorkbenchProjections = (cbctWorkbenchProjections ??
		[]) as string[];
	const typedCbctWorkbenchTools = (cbctWorkbenchTools ?? []) as string[];
	const typedCbctMprBlockers = (cbctMprBlockers ?? []) as string[];
	const typedCbctMprWarnings = (cbctMprWarnings ?? []) as string[];
	const typedCbctResourceSafetyCaps = (cbctResourceSafetyCaps ??
		[]) as string[];
	const typedDicomWorkstationReadiness =
		dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const typedDicomRenderCachePlan = mergedProps.dicomRenderCachePlan as any;
	const typedIntegrationPresets = (integrationPresets ?? []) as Array<any>;

	return (
		<>
			<section
				className="integration-presets"
				aria-label="Пресеты миграции и внешних систем"
			>
				<div className="import-copy">
					<Database aria-hidden="true" />
					<div>
						<p className="eyebrow">Источники данных</p>
						<h2>
							Старая программа, таблица, бумага и снимки идут через один
							понятный предпросмотр
						</h2>
						<p>
							Это не кнопки для врача. Это карта миграции для владельца или
							администратора: что можно разобрать сейчас, где нужна карта полей,
							а где потребуется отдельное подключение.
						</p>
					</div>
				</div>
				<div className="preset-grid">
					{typedIntegrationPresets.map((preset) => (
						<details
							className={`preset-card preset-${preset.status}`}
							key={preset.id}
							open={preset.status === "usable_now"}
						>
							<summary className="preset-card-head">
								<div>
									<strong>{preset.title}</strong>
									<p>
										{preset.vendor} ·{" "}
										{integrationCategoryLabels[preset.category]} · риск{" "}
										{preset.riskLevel}
									</p>
								</div>
								<span>{integrationStatusLabels[preset.status]}</span>
							</summary>
							<div
								className="preset-capabilities"
								aria-label="Что переносит источник"
							>
								{preset.capabilities.slice(0, 6).map((capability) => (
									<span key={capability}>
										{integrationCapabilityLabels[capability]}
									</span>
								))}
							</div>
							<ul>
								{preset.migrationNotes.slice(0, 2).map((note) => (
									<li key={note}>{note}</li>
								))}
							</ul>
							<small>
								Вход:{" "}
								{preset.supportedInputs
									.slice(0, 4)
									.map(humanizeIntegrationInput)
									.join(", ")}
							</small>
						</details>
					))}
				</div>
			</section>
		</>
	);
}
