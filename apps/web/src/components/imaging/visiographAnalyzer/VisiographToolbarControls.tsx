/**
 * VisiographToolbarControls.tsx — Панель инструментов визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { cockpitToolbarStyle } from "../VisiographAnalyzerStyles.js";
import { VisiographCockpitPresets } from "../VisiographCockpitPresets.js";
import { VisiographToothPickerDropdown } from "./VisiographToothPickerDropdown.js";
import { VisiographToolbarActions } from "./VisiographToolbarActions.js";
import type { VisiographToolbarControlsProps } from "./types.js";

export function VisiographToolbarControls({
	quickPreset,
	setQuickPreset,
	isStudioMode,
	onToggleStudio,
	onOpenApexRuler,
	isNormaApplied,
	onApplyNormaTo043,
	isAnalyzing,
	onRunAiAnalysis,
	hasAiReport,
	onOpenSensorViewer,
	boundToothCode,
	onBindTooth,
}: VisiographToolbarControlsProps) {
	return (
		<div data-testid="visiograph-cockpit-toolbar" style={cockpitToolbarStyle}>
			<VisiographCockpitPresets
				quickPreset={quickPreset}
				setQuickPreset={setQuickPreset}
				isStudioMode={isStudioMode}
				onToggleStudio={onToggleStudio}
				onOpenApexRuler={onOpenApexRuler}
			/>

			{/* FDI Tooth Selector (Mandate 8e: 1-click RVG to FDI tooth) */}
			<VisiographToothPickerDropdown
				boundToothCode={boundToothCode}
				onBindTooth={onBindTooth}
			/>

			{/* Actions */}
			<VisiographToolbarActions
				isNormaApplied={isNormaApplied}
				onApplyNormaTo043={onApplyNormaTo043}
				isAnalyzing={isAnalyzing}
				onRunAiAnalysis={onRunAiAnalysis}
				hasAiReport={hasAiReport}
				onOpenSensorViewer={onOpenSensorViewer}
			/>
		</div>
	);
}
