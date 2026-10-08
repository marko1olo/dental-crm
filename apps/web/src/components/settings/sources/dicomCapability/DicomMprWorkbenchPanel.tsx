import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
} from "@dental/shared";
import { CtPlanningToolsPanel } from "../../../ctPlanningTools";
import { DicomDiagnosticsPanel } from "./DicomDiagnosticsPanel";
import { DicomMprControlPanel } from "./DicomMprControlPanel";
import { DicomMprHeader } from "./DicomMprHeader";
import { DicomMprRoadmapPanel } from "./DicomMprRoadmapPanel";
import { DicomMprVisualizerPanel } from "./DicomMprVisualizerPanel";
import { DicomOhifBridgePanel } from "./DicomOhifBridgePanel";
import { DicomResourcePolicyPanel } from "./DicomResourcePolicyPanel";
import type { CbctWorkbenchPlane } from "./types";

export interface DicomMprWorkbenchPanelProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mergedProps: any;
}

export function DicomMprWorkbenchPanel({
	mergedProps,
}: DicomMprWorkbenchPanelProps) {
	const {
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
		dicomViewerLaunchManifest,
		dicomReadinessCheckLabels,
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

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedImagingViewerActiveTool = imagingViewerActiveTool as any;
	const typedCtPlanningActiveQuickActionId = ctPlanningActiveQuickActionId as
		| string
		| null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedCtPlanningImplantPlan = ctPlanningImplantPlan as any | null;
	const typedDicomViewerWorkbenchManifest =
		dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomViewerToolStateBundle = dicomViewerToolStateBundle as
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		any | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedDicomRenderCachePlan = mergedProps.dicomRenderCachePlan as any;

	const handleResetEndpointState = () => {
		setDicomWebCheck(null);
		setDicomViewerLaunchManifest(null);
		setDicomViewerToolStateBundle(null);
		setDicomViewerWorkbenchManifest(null);
		setDicomWorkbenchLocalSavedAt(null);
		setDicomWorkstationReadiness(null);
		setDicomRenderCachePlan(null);
	};

	const handleResetOhifState = () => {
		setDicomViewerLaunchManifest(null);
		setDicomViewerToolStateBundle(null);
		setDicomViewerWorkbenchManifest(null);
		setDicomWorkbenchLocalSavedAt(null);
		setDicomWorkstationReadiness(null);
		setDicomRenderCachePlan(null);
	};

	return (
		<section
			className="dicom-mpr-workbench"
			aria-label="Готовность рабочего места КЛКТ и КТ-срезов"
		>
			<DicomMprHeader cbctWorkbenchSeries={cbctWorkbenchSeries} />

			<DicomMprRoadmapPanel
				mprClinicalNextStep={mprClinicalNextStep}
				mprClinicalChecklist={mprClinicalChecklist}
				mprOperatorSummaryCards={mprOperatorSummaryCards}
			/>

			<CtPlanningToolsPanel
				canPlan={mprControlsReady}
				compact
				activeTool={typedImagingViewerActiveTool}
				activeQuickActionId={typedCtPlanningActiveQuickActionId}
				onActivateTool={applyCtPlanningQuickAction}
				selectedImplantId={typedCtPlanningImplantPlan?.itemId ?? null}
				selectedImplantPlan={typedCtPlanningImplantPlan}
				onSelectImplant={selectCtPlanningImplantFromSettings}
				toolStateBundle={
					typedDicomViewerWorkbenchManifest?.toolStateBundle ??
					typedDicomViewerToolStateBundle
				}
				dentalModelWorkbenchManifest={activeDentalModelWorkbenchManifest}
				localBridgeReadiness={typedLocalBridgeReadiness}
			/>

			<div className="dicom-mpr-layout">
				<div className="mpr-plane-grid">
					{(cbctWorkbenchPlanes as CbctWorkbenchPlane[]).map((plane) => {
						const planeSupported = typedCbctWorkbenchProjections.includes(
							plane.key,
						);
						const planeAvailable = mprControlsReady && planeSupported;
						const planeUnavailableReason = !mprControlsReady
							? mprSeriesRequiredProjectionLabel
							: planeSupported
								? ""
								: mprUnavailableProjectionLabel;
						return (
							<button
								className={`mpr-plane ${mprProjection === plane.key ? "active" : ""}`}
								key={plane.key}
								type="button"
								onClick={() => setMprProjection(plane.key)}
								disabled={!planeAvailable}
								aria-pressed={mprProjection === plane.key}
								aria-label={`${plane.title}: ${plane.detail}${planeUnavailableReason ? `; ${planeUnavailableReason}` : ""}`}
							>
								<span>{plane.title}</span>
								<small>{plane.detail}</small>
								{planeUnavailableReason ? (
									<small className="mpr-plane-unavailable">
										{planeUnavailableReason}
									</small>
								) : null}
							</button>
						);
					})}
				</div>

				<DicomMprVisualizerPanel
					mprControlsReady={mprControlsReady}
					mprAxisVisualizerStyle={mprAxisVisualizerStyle}
					mprAxisVisualizerLabel={mprAxisVisualizerLabel}
					handleMprKeyboardNavigation={handleMprKeyboardNavigation}
					mprProjectionCompass={mprProjectionCompass}
					mprCrosshairEnabled={mprCrosshairEnabled}
					mprAxisAngleBadge={mprAxisAngleBadge}
					mprSlabBadge={mprSlabBadge}
					mprSliceBadge={mprSliceBadge}
					mprActiveProjectionLabel={mprActiveProjectionLabel}
					mprActiveProjectionOrientation={mprActiveProjectionOrientation}
					mprAxisDirectionLabel={mprAxisDirectionLabel}
					mprSlabMm={mprSlabMm}
					mprSliceLabel={mprSliceLabel}
					mprAxisGuidance={mprAxisGuidance}
					mprWorkbenchSummaryText={mprWorkbenchSummaryText}
					mprLinkedPlanesEnabled={mprLinkedPlanesEnabled}
					mprNearestClinicalPreset={mprNearestClinicalPreset}
					applyNearestMprClinicalPreset={applyNearestMprClinicalPreset}
				/>

				<DicomMprControlPanel
					mprControlsReady={mprControlsReady}
					cbctWorkbenchProjections={typedCbctWorkbenchProjections}
					mprProjection={mprProjection}
					setMprProjection={setMprProjection}
					mprProjectionLabels={mprProjectionLabels}
					mprAxisDeg={mprAxisDeg}
					mprAxisRangeValue={mprAxisRangeValue}
					mprAxisBounds={mprAxisBounds}
					setMprAxisDeg={setMprAxisDeg}
					clampMprAxisDeg={clampMprAxisDeg}
					mprAxisNudgeDeg={mprAxisNudgeDeg}
					formatSignedMprStep={formatSignedMprStep}
					mprAxisPresetDeg={mprAxisPresetDeg}
					mprSlabMm={mprSlabMm}
					mprSlabRangeValue={mprSlabRangeValue}
					mprSlabBounds={mprSlabBounds}
					setMprSlabMm={setMprSlabMm}
					clampMprSlabMm={clampMprSlabMm}
					mprSlabNudgeMm={mprSlabNudgeMm}
					mprSlabPresetMm={mprSlabPresetMm}
					mprSliceLabel={mprSliceLabel}
					mprSliceMaxIndex={mprSliceMaxIndex}
					mprSafeSliceIndex={mprSafeSliceIndex}
					mprSliceRangeValue={mprSliceRangeValue}
					setMprSliceIndex={setMprSliceIndex}
					clampMprSliceIndex={clampMprSliceIndex}
					mprSliceNudgeSteps={mprSliceNudgeSteps}
					mprSlicePresetFractions={mprSlicePresetFractions}
					mprSliceIndexFromFraction={mprSliceIndexFromFraction}
					resetMprControls={resetMprControls}
					mprWorkbenchLocalSavedAt={mprWorkbenchLocalSavedAt}
					formatTime={formatTime}
					mprWorkbenchDraftRestored={mprWorkbenchDraftRestored}
					restoreMprWorkbenchLocalDraft={restoreMprWorkbenchLocalDraft}
					mprClinicalPresets={mprClinicalPresets}
					describeMprClinicalPresetProjectionFallback={
						describeMprClinicalPresetProjectionFallback
					}
					mprClinicalPresetButtonClass={mprClinicalPresetButtonClass}
					applyMprClinicalPreset={applyMprClinicalPreset}
					mprNearestClinicalPreset={mprNearestClinicalPreset}
					mprWindowPresetLabels={mprWindowPresetLabels}
					mprWindowPreset={mprWindowPreset}
					setMprWindowPreset={setMprWindowPreset}
					mprCrosshairEnabled={mprCrosshairEnabled}
					setMprCrosshairEnabled={setMprCrosshairEnabled}
					mprLinkedPlanesEnabled={mprLinkedPlanesEnabled}
					setMprLinkedPlanesEnabled={setMprLinkedPlanesEnabled}
				/>
			</div>

			<div className="recognition-notes">
				{typedCbctWorkbenchTools.map((tool) => (
					<span key={tool}>
						{mergedProps.mprToolLabels?.[tool] ?? "инструмент просмотра"}
					</span>
				))}
				{typedCbctMprBlockers.map((blocker) => (
					<span key={blocker}>{blocker}</span>
				))}
				{typedCbctMprWarnings.map((warning) => (
					<span key={warning}>{warning}</span>
				))}
			</div>

			<DicomResourcePolicyPanel
				cbctWorkbenchSeries={cbctWorkbenchSeries}
				mprLoadStrategyLabels={mprLoadStrategyLabels}
				mprResourceTierLabels={mprResourceTierLabels}
				mprCacheModeLabels={mprCacheModeLabels}
				cbctResourceSafetyCaps={typedCbctResourceSafetyCaps}
			/>

			<DicomOhifBridgePanel
				dicomViewerLaunchManifest={dicomViewerLaunchManifest}
				dicomViewerLaunchModeLabels={dicomViewerLaunchModeLabels}
				dicomWebEndpointUrl={dicomWebEndpointUrl}
				setDicomWebEndpointUrl={setDicomWebEndpointUrl}
				ohifBaseUrl={ohifBaseUrl}
				setOhifBaseUrl={setOhifBaseUrl}
				onResetEndpointState={handleResetEndpointState}
				onResetOhifState={handleResetOhifState}
				cbctWorkbenchSeries={cbctWorkbenchSeries}
				isDicomWorkbenchBuilding={isDicomWorkbenchBuilding}
				buildDicomViewerWorkbenchManifest={buildDicomViewerWorkbenchManifest}
				dicomWorkbenchSeriesGuidanceId={dicomWorkbenchSeriesGuidanceId}
				isDicomWorkstationChecking={isDicomWorkstationChecking}
				checkDicomWorkstationReadiness={checkDicomWorkstationReadiness}
				isDicomManifestBuilding={isDicomManifestBuilding}
				buildDicomViewerLaunchManifest={buildDicomViewerLaunchManifest}
				dicomArchiveAddressReady={dicomArchiveAddressReady}
				isDicomWebChecking={isDicomWebChecking}
				checkDicomWebConnector={checkDicomWebConnector}
				dicomArchiveAddressGuidanceId={dicomArchiveAddressGuidanceId}
				buildDicomViewerToolStateBundle={buildDicomViewerToolStateBundle}
				isDicomToolStateBuilding={isDicomToolStateBuilding}
				dicomExecutionLaneLabels={dicomExecutionLaneLabels}
				typedDicomWorkstationReadiness={typedDicomWorkstationReadiness}
				buildDicomRenderCachePlan={buildDicomRenderCachePlan}
				isDicomRenderCachePlanning={isDicomRenderCachePlanning}
				dicomWorkstationGuidanceId={dicomWorkstationGuidanceId}
				dicomWorkstationReadiness={dicomWorkstationReadiness}
				dicomWebCheck={dicomWebCheck}
				dicomWebStatusLabels={dicomWebStatusLabels}
				dicomLabel={dicomLabel}
			/>

			<DicomDiagnosticsPanel
				typedDicomViewerWorkbenchManifest={typedDicomViewerWorkbenchManifest}
				dicomQualityModeLabels={dicomQualityModeLabels}
				dicomViewerLaunchModeLabels={dicomViewerLaunchModeLabels}
				dicomTextureStrategyLabels={dicomTextureStrategyLabels}
				dicomRenderMemoryBudgetClassLabels={dicomRenderMemoryBudgetClassLabels}
				dicomDiagnosticPixelPolicyLabels={dicomDiagnosticPixelPolicyLabels}
				dicomWorkbenchLocalSavedAt={dicomWorkbenchLocalSavedAt}
				formatTime={formatTime}
				dicomWorkbenchServerBundle={dicomWorkbenchServerBundle}
				dicomWorkbenchSourceIsRedacted={dicomWorkbenchSourceIsRedacted}
				saveDicomWorkbenchBundleToServer={saveDicomWorkbenchBundleToServer}
				isDicomWorkbenchServerSaving={isDicomWorkbenchServerSaving}
				reconnectDicomWorkbenchFromCurrentFolder={
					reconnectDicomWorkbenchFromCurrentFolder
				}
				imagingFolderPath={imagingFolderPath}
				isDicomWorkbenchReconnecting={isDicomWorkbenchReconnecting}
				restoreDicomWorkbenchServerBundle={restoreDicomWorkbenchServerBundle}
				downloadDicomWorkbenchManifest={downloadDicomWorkbenchManifest}
				clearDicomWorkbenchRecovery={clearDicomWorkbenchRecovery}
				typedDicomWorkstationReadiness={typedDicomWorkstationReadiness}
				dicomRuntimeTierLabels={dicomRuntimeTierLabels}
				mprLoadStrategyLabels={mprLoadStrategyLabels}
				dicomGpuClassLabels={dicomGpuClassLabels}
				dicomExecutionLaneLabels={dicomExecutionLaneLabels}
				dicomReadinessCheckLabels={dicomReadinessCheckLabels}
				typedDicomRenderCachePlan={typedDicomRenderCachePlan}
				dicomLabel={dicomLabel}
			/>
		</section>
	);
}
