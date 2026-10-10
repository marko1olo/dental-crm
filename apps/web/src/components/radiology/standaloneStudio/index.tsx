import React from "react";
import { Smartphone } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import { CbctHotkeysStatusBar } from "../CbctHotkeysStatusBar.js";
import { RadiologyConsultationSplit } from "../RadiologyConsultationSplit.js";
import { DentalLabOrderModal } from "../../lab/DentalLabOrderModal.js";
import { useCbctStandaloneStudio } from "./useCbctStandaloneStudio.js";
import { StudioTopToolbar } from "./StudioTopToolbar.js";
import { StudioViewportGrid } from "./StudioViewportGrid.js";
import { StudioSidebarControls } from "./StudioSidebarControls.js";
import type { CbctStandaloneStudioViewProps } from "./types.js";

export * from "./types.js";
export * from "./useCbctStandaloneStudio.js";
export * from "./StudioTopToolbar.js";
export * from "./StudioViewportGrid.js";
export * from "./StudioSidebarControls.js";

/**
 * Autonomous Fullscreen CBCT 3D MPR Radiology Studio Cockpit for Dedicated Windows & Secondary Monitors.
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8e: Doctor Autonomy — dedicated pop-out window (100vw, 100vh), zero CRM sidebar clutter.
 * - Mandate 8l: Real-time MPR reslicing & implant planning with cross-window broadcast sync.
 * - Anti-leak WebGL Teardown: Guaranteed canvas & VRAM disposal on unmount.
 */
export const CbctStandaloneStudioView: React.FC<CbctStandaloneStudioViewProps> = (props) => {
	const studio = useCbctStandaloneStudio(props);

	return (
		<div
			ref={studio.containerRef}
			id={studio.modalId}
			data-testid="cbct-standalone-studio-view"
			data-cbct-cockpit="true"
			data-theme="dark"
			style={{ colorScheme: "dark" }}
			className="w-screen h-screen min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col overflow-hidden select-none cbct-dark-cockpit fixed inset-0 z-[9999]"
		>
			{/* Mobile adaptation notice if opened on narrow screen */}
			{studio.isMobileScreen && (
				<div className="bg-amber-950/80 border-b border-amber-800 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200 shrink-0 z-50">
					<div className="flex items-center gap-2">
						<Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
						<span>Мобильный просмотр КТ. Для работы с имплантацией используйте ПК.</span>
					</div>
					<button
						type="button"
						onClick={studio.handleCloseStudio}
						className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-850 text-amber-200 border border-amber-700 font-semibold cursor-pointer text-[11px]"
					>
						В CRM
					</button>
				</div>
			)}

			<StudioTopToolbar
				modalId={studio.modalId}
				patientDisplayName={studio.patientDisplayName}
				loadedSliceCount={studio.loadedSliceCount}
				volume={studio.volume}
				studioMode={studio.studioMode}
				handleSelectStudioMode={studio.handleSelectStudioMode}
				handleExportToEmr={studio.handleExportToEmr}
				handleExportCbctToFinance={() => {
					studio.handleBroadcastImplantPlaced();
					showToast("Операция имплантации и КЛКТ добавлены в смету приёма", "success");
				}}
				handleExportToPlan={() => {
					studio.handleBroadcastImplantPlaced();
					showToast("Этап имплантации добавлен в план лечения", "success");
				}}
				handleExportToLab={() => {
					studio.setLabOrderDraft({
						patientId: studio.effectivePatientId || "demo-patient",
						patientName: studio.patientDisplayName,
						toothFdi: String(studio.activeCrossSection?.nearestToothFdi ?? "46"),
						constructionType: "surgical_guide",
						colorVita: "A2",
					});
					studio.setIsLabOrderModalOpen(true);
				}}
				isSidebarOpen={studio.isSidebarOpen}
				setIsSidebarOpen={studio.setIsSidebarOpen}
				isStudioMenuOpen={studio.isStudioMenuOpen}
				setIsStudioMenuOpen={studio.setIsStudioMenuOpen}
				studioMenuRef={studio.studioMenuRef}
				handleResetAll={studio.handleResetAll}
				handleAutoDetectArch={studio.handleAutoDetectArch}
				showDentalArch={studio.showDentalArch}
				setShowDentalArch={studio.setShowDentalArch}
				showEdgeRulers={studio.showEdgeRulers}
				setShowEdgeRulers={studio.setShowEdgeRulers}
				handleExportPdfReport={studio.handleExportPdfReport}
				maximizedViewport={studio.maximizedViewport}
				setMaximizedViewport={studio.setMaximizedViewport}
				viewLayout={studio.viewLayout}
				setViewLayout={studio.setViewLayout}
				isFullscreen={studio.isFullscreen}
				handleToggleFullscreenModal={() => studio.setIsFullscreen((prev) => !prev)}
				onClose={studio.handleCloseStudio}
				activePresetId={studio.activePreset}
				onSelectPreset={studio.handleSelectPreset}
				crossSectionStepMm={studio.crossSectionStepMm}
				onChangeCrossSectionStepMm={studio.setCrossSectionStepMm}
				isUnsharpActive={studio.isUnsharpActive}
				onToggleUnsharp={studio.handleToggleUnsharp}
				sharpenAmount={studio.isUnsharpActive ? 0.18 : 0.0}
				windowWidth={studio.windowWidth}
				onChangeWindowWidth={studio.setWindowWidth}
				windowLevel={studio.windowLevel}
				onChangeWindowLevel={studio.setWindowLevel}
				slabThicknessMm={studio.slabThicknessMm}
				onChangeSlabThicknessMm={studio.setSlabThicknessMm}
				slabMode={studio.slabMode}
				onChangeSlabMode={studio.setSlabMode}
				panoThicknessMm={studio.panoThicknessMm}
				onChangePanoThicknessMm={studio.setPanoThicknessMm}
				onSelectClinicalPreset={studio.handleSelectClinicalPreset}
				onCopySnapshotToClipboard={studio.clipboardSnapshot.copySnapshotToClipboard}
				onOpenComparisonSplit={() => studio.setIsComparisonSplitOpen(true)}
			/>

			<main className="flex-1 flex min-h-0 w-full overflow-hidden relative">
				<StudioViewportGrid
					activeTool={studio.activeTool}
					onSelectTool={studio.setActiveTool}
					activePresetId={studio.activePreset}
					onSelectPreset={studio.handleSelectPreset}
					slabMode={studio.slabMode}
					onSelectSlabMode={studio.setSlabMode}
					onChangeSlabMode={studio.setSlabMode}
					slabThicknessMm={studio.slabThicknessMm}
					onChangeSlabThicknessMm={studio.setSlabThicknessMm}
					invertColors={studio.invertColors}
					onToggleInvertColors={() => studio.setInvertColors((prev) => !prev)}
					onResetAll={studio.handleResetAll}
					showDentalArch={studio.showDentalArch}
					onToggleDentalArch={() => {
						studio.setShowDentalArch((prev) => {
							const next = !prev;
							if (next && studio.studioMode !== "panoramic") studio.handleSelectStudioMode("panoramic");
							return next;
						});
					}}
					onAutoDetectArch={studio.handleAutoDetectArch}
					isSidebarOpen={studio.isSidebarOpen}
					mobileActiveTab={studio.mobileActiveTab}
					patientDisplayName={studio.patientDisplayName}
					patientId={studio.effectivePatientId}
					onSelectMobileTab={studio.setMobileActiveTab}
					volume={studio.volume}
					dicomLoadingStatus={studio.dicomLoader.dicomLoadingStatus}
					dicomProgress={studio.dicomLoader.dicomProgress}
					maximizedViewport={studio.maximizedViewport}
					viewLayout={studio.viewLayout}
					studioMode={studio.studioMode}
					onSelectStudioMode={studio.handleSelectStudioMode}
					folderInputRef={studio.dicomLoader.folderInputRef}
					zipInputRef={studio.dicomLoader.zipInputRef}
					handleDicomFilesChange={studio.dicomLoader.handleDicomFilesChange}
					activeViewport={studio.activeViewport}
					setActiveViewport={studio.setActiveViewport}
					hoveredViewport={studio.hoveredViewport}
					onHoverViewport={studio.setHoveredViewport}
					showEdgeRulers={studio.showEdgeRulers}
					handleToggleMaximize={studio.handleToggleMaximize}
					axialBaseCanvasRef={studio.axialBaseCanvasRef}
					axialOverlayCanvasRef={studio.axialOverlayCanvasRef}
					coronalBaseCanvasRef={studio.coronalBaseCanvasRef}
					coronalOverlayCanvasRef={studio.coronalOverlayCanvasRef}
					sagittalBaseCanvasRef={studio.sagittalBaseCanvasRef}
					sagittalOverlayCanvasRef={studio.sagittalOverlayCanvasRef}
					panoBaseCanvasRef={studio.panoBaseCanvasRef}
					panoOverlayCanvasRef={studio.panoOverlayCanvasRef}
					crossSectionBaseCanvasRef={studio.crossSectionBaseCanvasRef}
					crossSectionOverlayCanvasRef={studio.crossSectionOverlayCanvasRef}
					handleCanvasDoubleClick={studio.interactions.handleCanvasDoubleClick}
					handleCanvasMouseDown={studio.interactions.handleCanvasMouseDown}
					handleCanvasMouseMove={studio.interactions.handleCanvasMouseMove}
					handleCanvasMouseUp={studio.interactions.handleCanvasMouseUp}
					handleCanvasWheel={studio.interactions.handleCanvasWheel}
					getCanvasCursor={studio.interactions.getCanvasCursor}
					crosshairMm={studio.crosshairMm}
					currentVoxel={studio.currentVoxel}
					obliqueAngles={studio.obliqueAngles}
					setObliqueAngles={studio.setObliqueAngles}
					handleFullResetViewport={studio.handleResetAll}
					activeRotationHandle={studio.interactions.activeRotationHandle}
					isShiftRotating={studio.interactions.isShiftRotating}
					hoveredHandle={studio.interactions.hoveredHandle}
					transforms={studio.transforms}
					windowWidth={studio.windowWidth}
					windowLevel={studio.windowLevel}
					renderViewportOverlays={studio.renderViewportOverlays}
					handlePanoMouseDown={studio.interactions.handlePanoMouseDown}
					handlePanoMouseMove={studio.interactions.handlePanoMouseMove}
					handlePanoMouseUp={studio.interactions.handlePanoMouseUp}
					handleCrossSectionMouseDown={studio.interactions.handleCrossSectionMouseDown}
					handleCrossSectionMouseMove={studio.interactions.handleCrossSectionMouseMove}
					handleCrossSectionMouseUp={studio.interactions.handleCrossSectionMouseUp}
					dragImplantPart={studio.dragImplantPart}
					hoveredImplantPart={studio.hoveredImplantPart}
					activeCrossSection={studio.activeCrossSection}
					activeCrossSectionIdx={studio.activeCrossSectionIdx}
					crossSections={studio.crossSections}
					onLoadDemoVolume={studio.dicomLoader.handleLoadDemoVolume}
					rulers={studio.rulers}
					onClearRulers={studio.handleClearRulers}
					angles={studio.angles}
					onClearAngles={studio.handleClearAngles}
					onSelectQuickWlPreset={(wl) => {
						studio.setWindowWidth(wl.windowWidth);
						studio.setWindowLevel(wl.windowLevel);
					}}
					handleSelectTooth={studio.interactions.handleSelectTooth}
					archCurve={studio.archCurve}
					jawType={studio.jawType}
					onSwitchJaw={studio.handleSwitchJaw}
					activeToothFdi={studio.activeCrossSection?.nearestToothFdi}
					isUnsharpActive={studio.isUnsharpActive}
					onToggleUnsharp={studio.handleToggleUnsharp}
					onChangeCrossSectionIdx={studio.setActiveCrossSectionIdx}
					selectedBrand={studio.selectedBrand}
					onSelectBrand={studio.setSelectedBrand}
					selectedDiameterMm={studio.selectedDiameterMm}
					onSelectDiameterMm={studio.setSelectedDiameterMm}
					selectedLengthMm={studio.selectedLengthMm}
					onSelectLengthMm={studio.setSelectedLengthMm}
					displayBoneClass={studio.displayBoneClass}
					displayMeanHU={studio.displayMeanHU}
					displayTorque={studio.displayTorque}
					displayNerveClearanceMm={studio.displayNerveClearanceMm}
					displayDrillingProtocol={studio.displayDrillingProtocol}
					nerveSafetyStatus={studio.nerveAuditResult.safetyStatus === "danger" ? "danger" : studio.nerveAuditResult.safetyStatus === "warning" ? "warning" : "safe"}
					nervePoints={studio.nervePoints}
					interpolatedNerve3D={studio.interpolatedNerve3D}
					implant3DWorld={studio.implant3DWorld}
					nerveAuditResult={studio.nerveAuditResult}
					handleExportToEmr={studio.handleExportToEmr}
					handleExportToPlan={() => {
						studio.handleBroadcastImplantPlaced();
					}}
					onChangeWindowWidth={studio.setWindowWidth}
					onChangeWindowLevel={studio.setWindowLevel}
					onChangeSlabThicknessMm={studio.setSlabThicknessMm}
					onSelectClinicalPreset={studio.handleSelectClinicalPreset}
					panoThicknessMm={studio.panoThicknessMm}
					onChangePanoThicknessMm={studio.setPanoThicknessMm}
					panoProjectionMode={studio.panoProjectionMode}
					onChangePanoProjectionMode={studio.setPanoProjectionMode}
					crossSectionStepMm={studio.crossSectionStepMm}
					onChangeCrossSectionStepMm={studio.setCrossSectionStepMm}
					implantEntryXOffsetMm={studio.implantEntryXOffsetMm}
					onChangeImplantEntryXOffsetMm={studio.setImplantEntryXOffsetMm}
					implantEntryDepthMm={studio.implantEntryDepthMm}
					onChangeImplantEntryDepthMm={studio.setImplantEntryDepthMm}
					implantAngulationDeg={studio.implantAngulationDeg}
					onChangeImplantAngulationDeg={studio.setImplantAngulationDeg}
				/>

				<StudioSidebarControls
					isSidebarOpen={studio.isSidebarOpen}
					setIsSidebarOpen={studio.setIsSidebarOpen}
					mobileActiveTab={studio.mobileActiveTab}
					activeCrossSection={studio.activeCrossSection}
					activeCrossSectionIdx={studio.activeCrossSectionIdx}
					setActiveCrossSectionIdx={studio.setActiveCrossSectionIdx}
					crossSections={studio.crossSections}
					studioMode={studio.studioMode}
					setStudioMode={studio.setStudioMode}
					implantAngulationDeg={studio.implantAngulationDeg}
					setImplantAngulationDeg={studio.setImplantAngulationDeg}
					volume={studio.volume}
					handleToggleMaximize={studio.handleToggleMaximize}
					crossSectionBaseCanvasRef={studio.crossSectionBaseCanvasRef}
					crossSectionOverlayCanvasRef={studio.crossSectionOverlayCanvasRef}
					handleCrossSectionMouseDown={studio.interactions.handleCrossSectionMouseDown}
					handleCrossSectionMouseMove={studio.interactions.handleCrossSectionMouseMove}
					handleCrossSectionMouseUp={studio.interactions.handleCrossSectionMouseUp}
					dragImplantPart={studio.dragImplantPart}
					hoveredImplantPart={studio.hoveredImplantPart}
					handleFullResetViewport={studio.handleResetAll}
					maximizedViewport={studio.maximizedViewport}
					windowWidth={studio.windowWidth}
					windowLevel={studio.windowLevel}
					renderViewportOverlays={studio.renderViewportOverlays}
					sampledVoxelHU={studio.sampledVoxelHU}
					handleSelectTooth={studio.interactions.handleSelectTooth}
					implant3DWorld={studio.implant3DWorld}
					nerveAuditResult={studio.nerveAuditResult}
					huSamplingResult={studio.huSamplingResult}
					currentImplantSpec={studio.currentImplantSpec}
					nervePoints={studio.nervePoints}
					setNervePoints={studio.setNervePoints}
					nerveTotalLengthMm={studio.nerveTotalLengthMm}
					selectedNerveNodeIdx={studio.selectedNerveNodeIdx}
					setSelectedNerveNodeIdx={studio.setSelectedNerveNodeIdx}
					activeNerveSide={studio.activeNerveSide}
					onSwitchNerveSide={studio.setActiveNerveSide}
					displayBoneClass={studio.displayBoneClass || ""}
					displayMeanHU={studio.displayMeanHU}
					displayTorque={studio.displayTorque}
					displayNerveClearanceMm={studio.displayNerveClearanceMm}
					displayDrillingProtocol={studio.displayDrillingProtocol}
					selectedBrand={studio.selectedBrand}
					setSelectedBrand={studio.setSelectedBrand}
					selectedDiameterMm={studio.selectedDiameterMm}
					setSelectedDiameterMm={studio.setSelectedDiameterMm}
					selectedLengthMm={studio.selectedLengthMm}
					setSelectedLengthMm={studio.setSelectedLengthMm}
					implantEntryXOffsetMm={studio.implantEntryXOffsetMm}
					setImplantEntryXOffsetMm={studio.setImplantEntryXOffsetMm}
					setImplantEntryDepthMm={studio.setImplantEntryDepthMm}
					activeCaliper={studio.activeCaliper}
					handleExportToEmr={studio.handleExportToEmr}
					handleExportPdfReport={() => {
						void studio.handleExportPdfReport();
					}}
					handleExportToPlan={() => {
						studio.handleBroadcastImplantPlaced();
					}}
					handleExportToSchedule={() => {
						showToast("Запись на имплантацию отправлена в расписание", "info");
					}}
					handleExportToFinance={() => {
						studio.handleBroadcastImplantPlaced();
					}}
				/>
			</main>

			<CbctHotkeysStatusBar
				activeViewport={studio.activeViewport}
				onToggleHelp={() => {}}
				isPanelOpen={studio.isSidebarOpen}
				onTogglePanel={() => studio.setIsSidebarOpen((prev) => !prev)}
				isMaximized={studio.maximizedViewport !== null}
				onToggleMaximize={() => studio.handleToggleMaximize(studio.activeViewport)}
			/>

			{studio.isComparisonSplitOpen && (
				<div style={{ position: "fixed", inset: 0, zIndex: 999999 }} data-testid="cbct-comparison-split-overlay">
					<RadiologyConsultationSplit
						patientName={studio.patientDisplayName}
						initialSplitMode="dynamics"
						onClose={() => studio.setIsComparisonSplitOpen(false)}
					/>
				</div>
			)}

			{studio.isLabOrderModalOpen && studio.labOrderDraft && (
				<DentalLabOrderModal
					isOpen={studio.isLabOrderModalOpen}
					onClose={() => studio.setIsLabOrderModalOpen(false)}
					initialOrder={studio.labOrderDraft}
					patientId={studio.effectivePatientId}
					patientName={studio.patientDisplayName}
					onOrderSaved={() => studio.setIsLabOrderModalOpen(false)}
				/>
			)}
		</div>
	);
};

export default CbctStandaloneStudioView;
