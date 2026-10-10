import React from "react";
import { CbctRightSidebar } from "../mpr/CbctRightSidebar.js";
import type { StudioSidebarControlsProps } from "./types.js";

export const StudioSidebarControls: React.FC<StudioSidebarControlsProps> = (props) => {
	return (
		<CbctRightSidebar
			isSidebarOpen={props.isSidebarOpen}
			setIsSidebarOpen={props.setIsSidebarOpen}
			mobileActiveTab={props.mobileActiveTab}
			activeCrossSection={props.activeCrossSection}
			activeCrossSectionIdx={props.activeCrossSectionIdx}
			setActiveCrossSectionIdx={props.setActiveCrossSectionIdx}
			crossSections={props.crossSections}
			studioMode={props.studioMode}
			setStudioMode={props.setStudioMode}
			implantAngulationDeg={props.implantAngulationDeg}
			setImplantAngulationDeg={props.setImplantAngulationDeg}
			volume={props.volume}
			handleToggleMaximize={props.handleToggleMaximize}
			crossSectionBaseCanvasRef={props.crossSectionBaseCanvasRef}
			crossSectionOverlayCanvasRef={props.crossSectionOverlayCanvasRef}
			handleCrossSectionMouseDown={props.handleCrossSectionMouseDown}
			handleCrossSectionMouseMove={props.handleCrossSectionMouseMove}
			handleCrossSectionMouseUp={props.handleCrossSectionMouseUp}
			dragImplantPart={props.dragImplantPart}
			hoveredImplantPart={props.hoveredImplantPart}
			handleFullResetViewport={props.handleFullResetViewport}
			maximizedViewport={props.maximizedViewport}
			windowWidth={props.windowWidth}
			windowLevel={props.windowLevel}
			renderViewportOverlays={props.renderViewportOverlays}
			sampledVoxelHU={props.sampledVoxelHU}
			handleSelectTooth={props.handleSelectTooth}
			implant3DWorld={props.implant3DWorld}
			nerveAuditResult={props.nerveAuditResult}
			huSamplingResult={props.huSamplingResult}
			currentImplantSpec={props.currentImplantSpec}
			nervePoints={props.nervePoints}
			setNervePoints={props.setNervePoints}
			nerveTotalLengthMm={props.nerveTotalLengthMm}
			selectedNerveNodeIdx={props.selectedNerveNodeIdx}
			setSelectedNerveNodeIdx={props.setSelectedNerveNodeIdx}
			activeNerveSide={props.activeNerveSide}
			onSwitchNerveSide={props.onSwitchNerveSide}
			displayBoneClass={props.displayBoneClass}
			displayMeanHU={props.displayMeanHU}
			displayTorque={props.displayTorque}
			displayNerveClearanceMm={props.displayNerveClearanceMm}
			displayDrillingProtocol={props.displayDrillingProtocol}
			selectedBrand={props.selectedBrand}
			setSelectedBrand={props.setSelectedBrand}
			selectedDiameterMm={props.selectedDiameterMm}
			setSelectedDiameterMm={props.setSelectedDiameterMm}
			selectedLengthMm={props.selectedLengthMm}
			setSelectedLengthMm={props.setSelectedLengthMm}
			implantEntryXOffsetMm={props.implantEntryXOffsetMm}
			setImplantEntryXOffsetMm={props.setImplantEntryXOffsetMm}
			setImplantEntryDepthMm={props.setImplantEntryDepthMm}
			activeCaliper={props.activeCaliper}
			handleExportToEmr={props.handleExportToEmr}
			handleExportPdfReport={props.handleExportPdfReport}
			handleExportToPlan={props.handleExportToPlan}
			handleExportToSchedule={props.handleExportToSchedule}
			handleExportToFinance={props.handleExportToFinance}
		/>
	);
};
