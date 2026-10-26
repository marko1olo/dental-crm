/**
 * DicomQuickAccessBar.tsx — Верхняя панель быстрого доступа DENTE КТ (Layer 4)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import type { DicomQuickAccessBarProps } from "./types.js";
import { DicomQuickAccessTabs } from "./DicomQuickAccessTabs.js";
import { DicomQuickAccessTools } from "./DicomQuickAccessTools.js";
import { DicomQuickAccessPresets } from "./DicomQuickAccessPresets.js";
import { DicomQuickAccessActions } from "./DicomQuickAccessActions.js";

export const DicomQuickAccessBar: React.FC<DicomQuickAccessBarProps> = ({
	activeTool,
	onSelectTool,
	activeTab,
	onTabChange,
	viewportState,
	onViewportChange,
	isMeasureMenuOpen,
	onToggleMeasureMenu,
	onCloseMeasureMenu,
	measureMenuRef,
	onOpenHuProfile,
	onInstantScreenCapture,
	isWindowPanelOpen,
	onToggleWindowPanel,
	isClippingPanelOpen,
	onToggleClippingPanel,
	isClippingApplied,
	onAiAnalyze,
	isAiAnalyzing,
	aiReport,
	hasAiFindings,
	onToggleFindingsDrawer,
	onNormaClick,
	isNormaApplied,
	patientName,
	isFullscreen,
	onToggleFullscreen,
	onClose,
}) => {
	return (
		<div
			id="dicom-mpr-toolbar"
			data-testid="dicom-toolbox-ribbon"
			data-tour="imaging-filter"
			className="overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x shrink-0 px-2 flex items-center justify-between gap-2 select-none flex-nowrap whitespace-nowrap bg-[#090d16] border-b border-slate-800 text-slate-100 h-10 min-h-[40px]"
		>
			<DicomQuickAccessTabs activeTab={activeTab} onTabChange={onTabChange} />

			<div className="flex items-center gap-1 shrink-0">
				<DicomQuickAccessTools
					activeTool={activeTool}
					onSelectTool={onSelectTool}
					isMeasureMenuOpen={isMeasureMenuOpen}
					onToggleMeasureMenu={onToggleMeasureMenu}
					onCloseMeasureMenu={onCloseMeasureMenu}
					measureMenuRef={measureMenuRef}
					onOpenHuProfile={onOpenHuProfile}
					onInstantScreenCapture={onInstantScreenCapture}
				/>
				<DicomQuickAccessPresets
					viewportState={viewportState}
					onViewportChange={onViewportChange}
					isWindowPanelOpen={isWindowPanelOpen}
					onToggleWindowPanel={onToggleWindowPanel}
					isClippingPanelOpen={isClippingPanelOpen}
					onToggleClippingPanel={onToggleClippingPanel}
					isClippingApplied={isClippingApplied}
				/>
			</div>

			<DicomQuickAccessActions
				onAiAnalyze={onAiAnalyze}
				isAiAnalyzing={isAiAnalyzing}
				aiReport={aiReport}
				hasAiFindings={hasAiFindings}
				onToggleFindingsDrawer={onToggleFindingsDrawer}
				onNormaClick={onNormaClick}
				isNormaApplied={isNormaApplied}
				patientName={patientName}
				isFullscreen={isFullscreen}
				onToggleFullscreen={onToggleFullscreen}
				onClose={onClose}
			/>
		</div>
	);
};
