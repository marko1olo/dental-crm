/**
 * DENTE CRM — Clinical Toolbar & Window/Level Management Ribbon (Facade)
 * Clinical actions: "Норма: патологии нет", "Внести в медицинскую карту".
 * Full UI capabilities decomposed into ./dicomToolboxRibbonModules/:
 * - DicomQuickAccessBar (Top Ribbon & Tools)
 * - DicomWindowLevelPanel (WW/WL and Filter Knobs)
 * - DicomClippingRoiPanel (Sagittal/Coronal/Axial ROI)
 * - DicomBoneDensityModal (Carl E. Misch HU Profiler)
 *
 * Strict invariants: Mandate 8b (<=120 lines facade), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import {
	DicomBoneDensityModal,
	DicomClippingRoiPanel,
	DicomQuickAccessBar,
	DicomWindowLevelPanel,
	useDicomToolboxRibbonController,
	type DicomToolboxRibbonProps,
	type Ez3dToolboxRibbonProps,
} from "./dicomToolboxRibbonModules/index.js";

export type { DicomToolboxRibbonProps, Ez3dToolboxRibbonProps };

export const DicomToolboxRibbon: React.FC<DicomToolboxRibbonProps> = (props) => {
	const controller = useDicomToolboxRibbonController(props);

	return (
		<>
			<DicomQuickAccessBar
				activeTool={props.activeTool}
				onSelectTool={props.onSelectTool}
				activeTab={controller.activeTab}
				onTabChange={controller.setTab}
				viewportState={props.viewportState}
				onViewportChange={props.onViewportChange}
				isMeasureMenuOpen={controller.isMeasureMenuOpen}
				onToggleMeasureMenu={() => controller.setIsMeasureMenuOpen((prev) => !prev)}
				onCloseMeasureMenu={() => controller.setIsMeasureMenuOpen(false)}
				measureMenuRef={controller.measureMenuRef}
				onOpenHuProfile={controller.handleOpenHuProfile}
				onInstantScreenCapture={controller.handleInstantScreenCapture}
				isWindowPanelOpen={controller.isWindowPanelOpen}
				onToggleWindowPanel={() => controller.setIsWindowPanelOpen((prev) => !prev)}
				isClippingPanelOpen={controller.isClippingPanelOpen}
				onToggleClippingPanel={() => controller.setIsClippingPanelOpen((prev) => !prev)}
				isClippingApplied={controller.isClippingApplied}
				onAiAnalyze={props.onAiAnalyze}
				isAiAnalyzing={props.isAiAnalyzing}
				aiReport={props.aiReport}
				hasAiFindings={props.hasAiFindings}
				onToggleFindingsDrawer={props.onToggleFindingsDrawer}
				onNormaClick={props.onNormaClick}
				isNormaApplied={props.isNormaApplied}
				patientName={props.patientName}
				isFullscreen={controller.isFullscreen}
				onToggleFullscreen={controller.toggleFullscreen}
				onClose={props.onClose}
			/>

			{controller.isWindowPanelOpen && (
				<DicomWindowLevelPanel
					panelRef={controller.windowPanelRef}
					viewportState={props.viewportState}
					onViewportChange={props.onViewportChange}
				/>
			)}

			{controller.isClippingPanelOpen && (
				<DicomClippingRoiPanel
					panelRef={controller.clippingPanelRef}
					clippingPlane={controller.clippingPlane}
					onChangeClippingPlane={controller.setClippingPlane}
					clippingRef={controller.clippingRef}
					onChangeClippingRef={controller.setClippingRef}
					clippingDir={controller.clippingDir}
					onChangeClippingDir={controller.setClippingDir}
					isClippingApplied={controller.isClippingApplied}
					onToggleClipping={controller.handleApplyClippingToggle}
					onClose={() => controller.setIsClippingPanelOpen(false)}
				/>
			)}

			<DicomBoneDensityModal
				isOpen={controller.isHuModalOpen}
				stats={controller.huProfileStats}
				onClose={() => controller.setIsHuModalOpen(false)}
				onInsertToProtocol={controller.handleInsertHuToProtocol}
			/>
		</>
	);
};

// Backwards compatibility aliases
export const Ez3dToolboxRibbon = DicomToolboxRibbon;
