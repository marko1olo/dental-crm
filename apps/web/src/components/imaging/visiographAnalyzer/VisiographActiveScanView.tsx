/**
 * VisiographActiveScanView.tsx — Отображение активного снимка визиографа, панели инструментов и измерений
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { VisiographToolbarControls } from "./VisiographToolbarControls.js";
import { VisiographCanvasViewport } from "./VisiographCanvasViewport.js";
import { VisiographMeasurementPanel } from "./VisiographMeasurementPanel.js";
import type { VisiographActiveScanViewProps } from "./activeScanViewTypes.js";

export const VisiographActiveScanView: React.FC<VisiographActiveScanViewProps> = ({
	analyzer: a,
	toothCode,
}) => {
	if (!a.currentScan) return null;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			{a.currentImageUrl && (
				<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
					<VisiographToolbarControls
						quickPreset={a.quickPreset}
						setQuickPreset={a.setQuickPreset}
						isStudioMode={a.isStudioMode}
						onToggleStudio={() => a.setIsStudioMode((prev) => !prev)}
						onOpenApexRuler={() => {
							a.setInitialStudioTool("root_canal");
							a.setIsStudioMode(true);
						}}
						isNormaApplied={a.isNormaApplied}
						onApplyNormaTo043={a.handleApplyNormaTo043}
						isAnalyzing={a.isAnalyzing}
						onRunAiAnalysis={a.handleRunAiAnalysis}
						hasAiReport={Boolean(a.currentScan.aiReport)}
						onOpenSensorViewer={() => a.setIsSensorViewerOpen(true)}
						boundToothCode={a.boundToothCode}
						onBindTooth={a.handleBindTooth}
					/>
					<VisiographCanvasViewport
						isStudioMode={a.isStudioMode}
						currentImageUrl={a.currentImageUrl}
						effectivePatientId={a.effectivePatientId ?? undefined}
						currentScan={a.currentScan}
						initialStudioTool={a.initialStudioTool}
						quickPreset={a.quickPreset}
						onCloseStudio={() => a.setIsStudioMode(false)}
						filmstripItems={a.filmstripItems}
						onSelectStudy={a.handleSelectFilmstripStudy}
						onDoubleClickStudy={a.handleDoubleClickFilmstripStudy}
						isSaving={a.isSaving}
					/>
				</div>
			)}
			<VisiographMeasurementPanel
				toothStatesArray={a.toothStatesArray}
				appliedToothCodes={a.appliedToothCodes}
				isHistoryView={a.isHistoryView}
				selectedFindingCodes={a.selectedFindingCodes}
				onToggleFindingCode={(code) => {
					const next = new Set(a.selectedFindingCodes);
					if (next.has(code)) next.delete(code); else next.add(code);
					a.setSelectedFindingCodes(next);
				}}
				onToggleSelectAll={() => {
					const all = a.toothStatesArray.map((t) => t.code);
					a.setSelectedFindingCodes(a.selectedFindingCodes.size === all.length ? new Set() : new Set(all));
				}}
				isApplyingToChart={a.isApplyingToChart}
				onApplyFindingsToChart={a.handleApplyFindingsToChart}
				aiReport={a.currentScan?.aiReport ?? undefined}
				capturedAt={a.currentScan?.capturedAt}
				onInsertReportToProtocol={a.handleInsertReportToProtocol}
				currentScan={a.currentScan}
				deletingScanId={a.deletingScanId}
				onClear={a.handleClear}
				onDeleteScan={(s) => void a.deleteScan(s)}
				toothCode={toothCode}
				calibration={a.calibration}
				workingLengthMm={a.workingLengthMm}
				onMeasureWorkingLength={a.handleMeasureWorkingLength}
			/>
		</div>
	);
};
