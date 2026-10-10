import React from "react";
import { CbctHeaderBar } from "../mpr/CbctHeaderBar.js";
import type { StudioTopToolbarProps } from "./types.js";

export const StudioTopToolbar: React.FC<StudioTopToolbarProps> = (props) => {
	return (
		<CbctHeaderBar
			modalId={props.modalId}
			patientDisplayName={props.patientDisplayName}
			resolvedPatientName={props.patientDisplayName}
			loadedSliceCount={props.loadedSliceCount}
			volume={props.volume}
			studioMode={props.studioMode}
			handleSelectStudioMode={props.handleSelectStudioMode}
			handleExportToEmr={props.handleExportToEmr}
			handleExportCbctToFinance={props.handleExportCbctToFinance}
			handleExportToPlan={props.handleExportToPlan}
			handleExportToLab={props.handleExportToLab}
			isSidebarOpen={props.isSidebarOpen}
			setIsSidebarOpen={props.setIsSidebarOpen}
			isStudioMenuOpen={props.isStudioMenuOpen}
			setIsStudioMenuOpen={props.setIsStudioMenuOpen}
			studioMenuRef={props.studioMenuRef}
			handleResetAll={props.handleResetAll}
			handleAutoDetectArch={props.handleAutoDetectArch}
			showDentalArch={props.showDentalArch}
			setShowDentalArch={props.setShowDentalArch}
			showEdgeRulers={props.showEdgeRulers}
			setShowEdgeRulers={props.setShowEdgeRulers}
			handleExportPdfReport={props.handleExportPdfReport}
			maximizedViewport={props.maximizedViewport}
			setMaximizedViewport={props.setMaximizedViewport}
			viewLayout={props.viewLayout}
			setViewLayout={props.setViewLayout}
			isFullscreen={props.isFullscreen}
			handleToggleFullscreenModal={props.handleToggleFullscreenModal}
			onClose={props.onClose}
			activePresetId={props.activePresetId}
			onSelectPreset={props.onSelectPreset}
			crossSectionStepMm={props.crossSectionStepMm}
			onChangeCrossSectionStepMm={props.onChangeCrossSectionStepMm}
			isUnsharpActive={props.isUnsharpActive}
			onToggleUnsharp={props.onToggleUnsharp}
			sharpenAmount={props.sharpenAmount}
			windowWidth={props.windowWidth}
			onChangeWindowWidth={props.onChangeWindowWidth}
			windowLevel={props.windowLevel}
			onChangeWindowLevel={props.onChangeWindowLevel}
			slabThicknessMm={props.slabThicknessMm}
			onChangeSlabThicknessMm={props.onChangeSlabThicknessMm}
			slabMode={props.slabMode}
			onChangeSlabMode={props.onChangeSlabMode}
			panoThicknessMm={props.panoThicknessMm}
			onChangePanoThicknessMm={props.onChangePanoThicknessMm}
			onSelectClinicalPreset={props.onSelectClinicalPreset}
			onCopySnapshotToClipboard={props.onCopySnapshotToClipboard}
			onOpenComparisonSplit={props.onOpenComparisonSplit}
		/>
	);
};
