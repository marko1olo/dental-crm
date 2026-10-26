import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { getTissueNameFromHU } from "./cbctMprMath";
import { CbctHotkeysStatusBar } from "./CbctHotkeysStatusBar";
import { CbctLeftToolDock } from "./CbctLeftToolDock";
import {
	type StudioMode,
	type ViewLayoutMode,
	type CbctMprImplantStudioModalProps,
	DEFAULT_IAN_NERVE_POINTS,
	formatNerveNodesPlural,
	ROTATE_CURSOR,
} from "./mpr/cbctStudioTypes";
import { CbctHeaderBar } from "./mpr/CbctHeaderBar";
import { CbctRightSidebar } from "./mpr/CbctRightSidebar";
import { CbctMprViewportsGrid } from "./mpr/CbctMprViewportsGrid";
import { RadiologyConsultationSplit } from "./RadiologyConsultationSplit";
import { DentalLabOrderModal } from "../lab/DentalLabOrderModal";
import type { CbctVoxelVolume } from "./cbctMprMath";
import { useCbctStudioModalState } from "./studioModal/useCbctStudioModalState";
import { useCbctStudioController } from "./studioModal/useCbctStudioController";
import { useCbctDicomLoader } from "./mpr/useCbctDicomLoader";
import { CbctEmptyVolumeDropzone } from "./mpr/CbctEmptyVolumeDropzone";

export type { StudioMode, ViewLayoutMode, CbctMprImplantStudioModalProps };
export { DEFAULT_IAN_NERVE_POINTS, formatNerveNodesPlural, ROTATE_CURSOR, getTissueNameFromHU };
export { useCbctDicomLoader, CbctEmptyVolumeDropzone };

// Contract marker: data-testid="cbct-empty-volume-dropzone" (Исследование КЛКТ не загружено)

export const CbctMprImplantStudioModal: React.FC<
	CbctMprImplantStudioModalProps & {
		readonly initialViewLayout?: ViewLayoutMode | undefined;
		readonly initialVolume?: CbctVoxelVolume | null | undefined;
	}
> = (props) => {
	const {
		isOpen, onClose, study, patientName, patientId, onApplyToDiary043, onApplyToPlan,
		initialStudioMode, initialSidebarOpen, initialCaliper, initialViewLayout, initialVolume, initialImageIds, autoLoadDemo,
		initialTool, initialNervePoints,
	} = props;
	const modalId = "cbct-studio-modal";
	const modalContainerRef = useRef<HTMLDivElement | null>(null);

	const state = useCbctStudioModalState({
		initialStudioMode, initialSidebarOpen, initialCaliper, initialViewLayout, initialVolume,
		initialTool, initialNervePoints, patientName, patientId,
	});

	const ctrl = useCbctStudioController({
		isOpen, onClose, study, patientName, patientId, onApplyToDiary043, onApplyToPlan,
		initialVolume, initialImageIds, autoLoadDemo, state, modalContainerRef,
	});

	const { studioMode } = state;
	const { handleSelectStudioMode } = ctrl;

	if (!isOpen) return null;

	const modalContent = (
		<div
			id={`cbct-modal-${modalId}`}
			data-testid="cbct-studio-modal"
			data-cbct-cockpit="true"
			data-theme="dark"
			style={{ colorScheme: "dark" }}
			className={`fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-300 font-sans select-none overflow-hidden cbct-dark-cockpit ${
				state.isFullscreen ? "p-0" : "p-1 sm:p-2 bg-black/80 backdrop-blur-sm"
			}`}
		>
			<div
				ref={modalContainerRef}
				className="flex-1 flex flex-col w-full h-full min-h-0 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl relative"
				onDragOver={(e) => {
					e.preventDefault();
					ctrl.dicomLoader.setIsDragOverWindow(true);
				}}
				onDragLeave={() => ctrl.dicomLoader.setIsDragOverWindow(false)}
				onDrop={ctrl.dicomLoader.handleDropFiles}
			>
				<CbctHeaderBar
					modalId={modalId}
					patientDisplayName={state.patientDisplayName}
					resolvedPatientName={state.patientDisplayName}
					loadedSliceCount={state.loadedSliceCount}
					volume={state.volume}
					studioMode={state.studioMode}
					handleSelectStudioMode={ctrl.handleSelectStudioMode}
					handleExportToEmr={ctrl.handleExportToEmr}
					handleExportCbctToFinance={ctrl.handleExportCbctToFinance}
					handleExportToPlan={ctrl.handleExportToPlan}
					handleExportToLab={ctrl.handleExportToLab}
					isSidebarOpen={state.isSidebarOpen}
					setIsSidebarOpen={state.setIsSidebarOpen}
					isStudioMenuOpen={state.isStudioMenuOpen}
					setIsStudioMenuOpen={state.setIsStudioMenuOpen}
					studioMenuRef={state.studioMenuRef}
					handleResetAll={ctrl.handleResetAll}
					handleAutoDetectArch={ctrl.handleAutoDetectArch}
					showDentalArch={state.showDentalArch}
					setShowDentalArch={state.setShowDentalArch}
					showEdgeRulers={state.showEdgeRulers}
					setShowEdgeRulers={state.setShowEdgeRulers}
					handleExportPdfReport={ctrl.handleExportPdfReport}
					maximizedViewport={state.maximizedViewport}
					setMaximizedViewport={state.setMaximizedViewport}
					viewLayout={state.viewLayout}
					setViewLayout={state.setViewLayout}
					isFullscreen={state.isFullscreen}
					handleToggleFullscreenModal={() => state.setIsFullscreen((prev) => !prev)}
					onClose={ctrl.handleCloseStudio}
					onOpenPopoutWindow={ctrl.handleOpenPopoutWindow}
					studyId={study?.id}
					patientId={patientId}
					activePresetId={state.activePreset}
					onSelectPreset={ctrl.handleSelectPreset}
					crossSectionStepMm={state.crossSectionStepMm}
					onChangeCrossSectionStepMm={state.setCrossSectionStepMm}
					isUnsharpActive={state.isUnsharpActive}
					onToggleUnsharp={ctrl.handleToggleUnsharp}
					sharpenAmount={state.isUnsharpActive ? 0.18 : 0.0}
					windowWidth={state.windowWidth}
					onChangeWindowWidth={state.setWindowWidth}
					windowLevel={state.windowLevel}
					onChangeWindowLevel={state.setWindowLevel}
					slabThicknessMm={state.slabThicknessMm}
					onChangeSlabThicknessMm={state.setSlabThicknessMm}
					slabMode={state.slabMode}
					onChangeSlabMode={state.setSlabMode}
					panoThicknessMm={state.panoThicknessMm}
					onChangePanoThicknessMm={state.setPanoThicknessMm}
					onSelectClinicalPreset={ctrl.handleSelectClinicalPreset}
					onCopySnapshotToClipboard={ctrl.clipboardSnapshot.copySnapshotToClipboard}
					onOpenComparisonSplit={() => state.setIsComparisonSplitOpen(true)}
				/>

				<main className="flex-1 flex min-h-0 w-full overflow-hidden relative">
					<CbctLeftToolDock
						activeTool={state.activeTool}
						onSelectTool={state.setActiveTool}
						activePresetId={state.activePreset}
						onSelectPreset={ctrl.handleSelectPreset}
						slabMode={state.slabMode}
						onSelectSlabMode={state.setSlabMode}
						slabThicknessMm={state.slabThicknessMm}
						onChangeSlabThicknessMm={state.setSlabThicknessMm}
						invertColors={state.invertColors}
						onToggleInvertColors={() => state.setInvertColors((prev) => !prev)}
						onResetAll={ctrl.handleResetAll}
						showDentalArch={state.showDentalArch}
						onToggleDentalArch={() => {
							state.setShowDentalArch((prev) => {
								const next = !prev;
								if (next && state.studioMode !== "panoramic") ctrl.handleSelectStudioMode("panoramic");
								return next;
							});
						}}
						onAutoDetectArch={ctrl.handleAutoDetectArch}
					/>

					<CbctMprViewportsGrid
						isSidebarOpen={state.isSidebarOpen}
						mobileActiveTab={state.mobileActiveTab}
						patientDisplayName={state.patientDisplayName}
						patientId={patientId}
						onSelectMobileTab={state.setMobileActiveTab}
						volume={state.volume}
						dicomLoadingStatus={ctrl.dicomLoader.dicomLoadingStatus}
						dicomProgress={ctrl.dicomLoader.dicomProgress}
						maximizedViewport={state.maximizedViewport}
						viewLayout={state.viewLayout}
						studioMode={studioMode}
						onSelectStudioMode={handleSelectStudioMode}
						folderInputRef={ctrl.dicomLoader.folderInputRef}
						zipInputRef={ctrl.dicomLoader.zipInputRef}
						handleDicomFilesChange={ctrl.dicomLoader.handleDicomFilesChange}
						activeViewport={state.activeViewport}
						setActiveViewport={state.setActiveViewport}
						hoveredViewport={state.hoveredViewport}
						onHoverViewport={state.setHoveredViewport}
						showEdgeRulers={state.showEdgeRulers}
						handleToggleMaximize={ctrl.handleToggleMaximize}
						axialBaseCanvasRef={state.axialBaseCanvasRef}
						axialOverlayCanvasRef={state.axialOverlayCanvasRef}
						coronalBaseCanvasRef={state.coronalBaseCanvasRef}
						coronalOverlayCanvasRef={state.coronalOverlayCanvasRef}
						sagittalBaseCanvasRef={state.sagittalBaseCanvasRef}
						sagittalOverlayCanvasRef={state.sagittalOverlayCanvasRef}
						panoBaseCanvasRef={state.panoBaseCanvasRef}
						panoOverlayCanvasRef={state.panoOverlayCanvasRef}
						crossSectionBaseCanvasRef={state.crossSectionBaseCanvasRef}
						crossSectionOverlayCanvasRef={state.crossSectionOverlayCanvasRef}
						handleCanvasDoubleClick={ctrl.interactions.handleCanvasDoubleClick}
						handleCanvasMouseDown={ctrl.interactions.handleCanvasMouseDown}
						handleCanvasMouseMove={ctrl.interactions.handleCanvasMouseMove}
						handleCanvasMouseUp={ctrl.interactions.handleCanvasMouseUp}
						handleCanvasWheel={ctrl.interactions.handleCanvasWheel}
						getCanvasCursor={ctrl.interactions.getCanvasCursor}
						crosshairMm={state.crosshairMm}
						currentVoxel={state.currentVoxel}
						slabMode={state.slabMode}
						slabThicknessMm={state.slabThicknessMm}
						obliqueAngles={state.obliqueAngles}
						setObliqueAngles={state.setObliqueAngles}
						handleFullResetViewport={ctrl.handleFullResetViewport}
						activeRotationHandle={ctrl.interactions.activeRotationHandle}
						isShiftRotating={ctrl.interactions.isShiftRotating}
						hoveredHandle={ctrl.interactions.hoveredHandle}
						transforms={state.transforms}
						windowWidth={state.windowWidth}
						windowLevel={state.windowLevel}
						renderViewportOverlays={ctrl.renderViewportOverlays}
						handlePanoMouseDown={ctrl.interactions.handlePanoMouseDown}
						handlePanoMouseMove={ctrl.interactions.handlePanoMouseMove}
						handlePanoMouseUp={ctrl.interactions.handlePanoMouseUp}
						handleCrossSectionMouseDown={ctrl.interactions.handleCrossSectionMouseDown}
						handleCrossSectionMouseMove={ctrl.interactions.handleCrossSectionMouseMove}
						handleCrossSectionMouseUp={ctrl.interactions.handleCrossSectionMouseUp}
						dragImplantPart={state.dragImplantPart}
						hoveredImplantPart={state.hoveredImplantPart}
						activeCrossSection={state.activeCrossSection}
						activeCrossSectionIdx={state.activeCrossSectionIdx}
						crossSections={state.crossSections}
						onLoadDemoVolume={ctrl.dicomLoader.handleLoadDemoVolume}
						activeTool={state.activeTool}
						onSelectTool={state.setActiveTool}
						rulers={state.rulers}
						onClearRulers={ctrl.handleClearRulers}
						angles={state.angles}
						onClearAngles={ctrl.handleClearAngles}
						onSelectQuickWlPreset={ctrl.handleSelectQuickWlPreset}
						handleSelectTooth={ctrl.interactions.handleSelectTooth}
						archCurve={state.archCurve}
						jawType={state.jawType}
						onSwitchJaw={ctrl.handleSwitchJaw}
						activeToothFdi={state.activeCrossSection?.nearestToothFdi}
						isUnsharpActive={state.isUnsharpActive}
						onToggleUnsharp={ctrl.handleToggleUnsharp}
						onChangeCrossSectionIdx={state.setActiveCrossSectionIdx}
						selectedBrand={state.selectedBrand}
						onSelectBrand={state.setSelectedBrand}
						selectedDiameterMm={state.selectedDiameterMm}
						onSelectDiameterMm={state.setSelectedDiameterMm}
						selectedLengthMm={state.selectedLengthMm}
						onSelectLengthMm={state.setSelectedLengthMm}
						displayBoneClass={state.displayBoneClass}
						displayMeanHU={state.displayMeanHU ?? undefined}
						displayTorque={state.displayTorque}
						displayNerveClearanceMm={state.displayNerveClearanceMm ?? undefined}
						displayDrillingProtocol={state.displayDrillingProtocol}
						nerveSafetyStatus={state.nerveAuditResult.safetyStatus === "danger" ? "danger" : state.nerveAuditResult.safetyStatus === "warning" ? "warning" : "safe"}
						nervePoints={state.nervePoints}
						interpolatedNerve3D={state.interpolatedNerve3D}
						implant3DWorld={state.implant3DWorld}
						nerveAuditResult={state.nerveAuditResult}
						handleExportToEmr={ctrl.handleExportToEmr}
						handleExportToPlan={ctrl.handleExportToPlan}
						onChangeWindowWidth={state.setWindowWidth}
						onChangeWindowLevel={state.setWindowLevel}
						onChangeSlabThicknessMm={state.setSlabThicknessMm}
						onChangeSlabMode={state.setSlabMode}
						onSelectClinicalPreset={ctrl.handleSelectClinicalPreset}
						activePresetId={state.activePreset}
						panoThicknessMm={state.panoThicknessMm}
						onChangePanoThicknessMm={state.setPanoThicknessMm}
						panoProjectionMode={state.panoProjectionMode}
						onChangePanoProjectionMode={state.setPanoProjectionMode}
						crossSectionStepMm={state.crossSectionStepMm}
						onChangeCrossSectionStepMm={state.setCrossSectionStepMm}
						implantEntryXOffsetMm={state.implantEntryXOffsetMm}
						onChangeImplantEntryXOffsetMm={state.setImplantEntryXOffsetMm}
						implantEntryDepthMm={state.implantEntryDepthMm}
						onChangeImplantEntryDepthMm={state.setImplantEntryDepthMm}
						implantAngulationDeg={state.implantAngulationDeg}
						onChangeImplantAngulationDeg={state.setImplantAngulationDeg}
					/>

					<CbctRightSidebar
						isSidebarOpen={state.isSidebarOpen}
						setIsSidebarOpen={state.setIsSidebarOpen}
						mobileActiveTab={state.mobileActiveTab}
						activeCrossSection={state.activeCrossSection}
						activeCrossSectionIdx={state.activeCrossSectionIdx}
						setActiveCrossSectionIdx={state.setActiveCrossSectionIdx}
						crossSections={state.crossSections}
						studioMode={state.studioMode}
						setStudioMode={state.setStudioMode}
						implantAngulationDeg={state.implantAngulationDeg}
						setImplantAngulationDeg={state.setImplantAngulationDeg}
						volume={state.volume}
						handleToggleMaximize={ctrl.handleToggleMaximize}
						crossSectionBaseCanvasRef={state.crossSectionBaseCanvasRef}
						crossSectionOverlayCanvasRef={state.crossSectionOverlayCanvasRef}
						handleCrossSectionMouseDown={ctrl.interactions.handleCrossSectionMouseDown}
						handleCrossSectionMouseMove={ctrl.interactions.handleCrossSectionMouseMove}
						handleCrossSectionMouseUp={ctrl.interactions.handleCrossSectionMouseUp}
						dragImplantPart={state.dragImplantPart}
						hoveredImplantPart={state.hoveredImplantPart}
						handleFullResetViewport={ctrl.handleFullResetViewport}
						maximizedViewport={state.maximizedViewport}
						windowWidth={state.windowWidth}
						windowLevel={state.windowLevel}
						renderViewportOverlays={ctrl.renderViewportOverlays}
						sampledVoxelHU={state.sampledVoxelHU}
						handleSelectTooth={ctrl.interactions.handleSelectTooth}
						implant3DWorld={state.implant3DWorld}
						nerveAuditResult={state.nerveAuditResult}
						huSamplingResult={state.huSamplingResult}
						currentImplantSpec={state.currentImplantSpec}
						nervePoints={state.nervePoints}
						setNervePoints={state.setNervePoints}
						nerveTotalLengthMm={state.nerveTotalLengthMm}
						selectedNerveNodeIdx={state.selectedNerveNodeIdx}
						setSelectedNerveNodeIdx={state.setSelectedNerveNodeIdx}
						activeNerveSide={state.activeNerveSide}
						onSwitchNerveSide={state.setActiveNerveSide}
						displayBoneClass={state.displayBoneClass}
						displayMeanHU={state.displayMeanHU ?? undefined}
						displayTorque={state.displayTorque}
						displayNerveClearanceMm={state.displayNerveClearanceMm ?? undefined}
						displayDrillingProtocol={state.displayDrillingProtocol}
						selectedBrand={state.selectedBrand}
						setSelectedBrand={state.setSelectedBrand}
						selectedDiameterMm={state.selectedDiameterMm}
						setSelectedDiameterMm={state.setSelectedDiameterMm}
						selectedLengthMm={state.selectedLengthMm}
						setSelectedLengthMm={state.setSelectedLengthMm}
						implantEntryXOffsetMm={state.implantEntryXOffsetMm}
						setImplantEntryXOffsetMm={state.setImplantEntryXOffsetMm}
						setImplantEntryDepthMm={state.setImplantEntryDepthMm}
						activeCaliper={state.activeCaliper}
						handleExportToEmr={ctrl.handleExportToEmr}
						handleExportPdfReport={() => { void ctrl.handleExportPdfReport(); }}
						handleExportToPlan={ctrl.handleExportToPlan}
						handleExportToSchedule={ctrl.handleExportToSchedule}
						handleExportToFinance={ctrl.handleExportCbctToFinance}
					/>
				</main>

				<CbctHotkeysStatusBar
					activeViewport={state.activeViewport}
					onToggleHelp={() => {}}
					isPanelOpen={state.isSidebarOpen}
					onTogglePanel={() => state.setIsSidebarOpen((prev) => !prev)}
					isMaximized={state.maximizedViewport !== null}
					onToggleMaximize={() => ctrl.handleToggleMaximize(state.activeViewport)}
				/>

				{state.isComparisonSplitOpen && (
					<div style={{ position: "fixed", inset: 0, zIndex: 999999 }} data-testid="cbct-comparison-split-overlay">
						<RadiologyConsultationSplit
							patientName={patientName || state.patientDisplayName}
							initialLeftStudy={study ?? undefined}
							initialSplitMode="dynamics"
							onClose={() => state.setIsComparisonSplitOpen(false)}
							onInsertProtocol={(note) => { onApplyToDiary043?.(note); }}
						/>
					</div>
				)}

				{ctrl.isLabOrderModalOpen && ctrl.labOrderDraft && (
					<DentalLabOrderModal
						isOpen={ctrl.isLabOrderModalOpen}
						onClose={() => ctrl.setIsLabOrderModalOpen(false)}
						initialOrder={ctrl.labOrderDraft}
						patientId={patientId}
						patientName={state.patientDisplayName}
						doctorId={study?.doctorId ?? undefined}
						doctorName={study?.doctorName ?? undefined}
						initialToothFdi={ctrl.labOrderDraft.toothFdi ?? undefined}
						onOrderSaved={() => ctrl.setIsLabOrderModalOpen(false)}
					/>
				)}
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(modalContent, document.body) : modalContent;
};
