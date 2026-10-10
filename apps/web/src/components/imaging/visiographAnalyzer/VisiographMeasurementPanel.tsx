import { Activity, CheckCircle2, Loader2, Ruler } from "lucide-react";
import React from "react";
import { getApplyChartButtonStyle } from "../VisiographAnalyzerStyles.js";
import { VisiographFindingsSection } from "../VisiographFindingsSection.js";
import { VisiographReportViewer } from "../VisiographReportViewer.js";
import { VisiographBottomActions } from "../VisiographBottomActions.js";
import type { VisiographMeasurementPanelProps } from "./types.js";

export function VisiographMeasurementPanel({
	toothStatesArray,
	appliedToothCodes,
	isHistoryView,
	selectedFindingCodes,
	onToggleFindingCode,
	onToggleSelectAll,
	isApplyingToChart,
	onApplyFindingsToChart,
	aiReport,
	capturedAt,
	onInsertReportToProtocol,
	currentScan,
	deletingScanId,
	onClear,
	onDeleteScan,
	toothCode,
	calibration,
	workingLengthMm,
}: VisiographMeasurementPanelProps) {
	return (
		<>
			{/* Tooth findings approval */}
			<VisiographFindingsSection
				toothStates={toothStatesArray as any}
				appliedToothCodes={appliedToothCodes as any}
				isHistoryView={isHistoryView}
				selectedFindingCodes={selectedFindingCodes}
				onToggleFindingCode={onToggleFindingCode}
				onToggleSelectAll={onToggleSelectAll}
				applyButton={
					<button
						type="button"
						data-testid="btn-apply-findings-to-chart"
						onClick={onApplyFindingsToChart}
						disabled={isApplyingToChart}
						style={getApplyChartButtonStyle(isApplyingToChart)}
					>
						{isApplyingToChart ? (
							<>
								<Loader2 size={14} className="animate-spin" />
								<span>Внесение...</span>
							</>
						) : (
							<>
								<CheckCircle2 size={14} />
								<span>
									Применить выбранные к формуле ({selectedFindingCodes.size})
								</span>
							</>
						)}
					</button>
				}
			/>

			{/* Endodontic Working Length & PAI Measurement Summary Badge */}
			{workingLengthMm !== null && workingLengthMm !== undefined && (
				<div
					data-testid="visiograph-measurement-summary"
					className="p-2.5 rounded-xl border border-[var(--teal)]/30 bg-[var(--teal)]/5 flex items-center justify-between gap-3 text-xs"
				>
					<div className="flex items-center gap-2 text-[var(--ink)]">
						<Ruler size={14} className="text-[var(--teal)] shrink-0" />
						<span>
							Рабочая длина (WL) зуба {toothCode || currentScan?.toothCode || "—"}:{" "}
							<strong className="text-[var(--teal)] font-semibold">
								{workingLengthMm.toFixed(1)} мм
							</strong>
						</span>
					</div>
					{calibration && (
						<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
							<Activity size={12} className="text-[var(--muted)]" />
							<span>Масштаб: {calibration.pixelsPerMm.toFixed(1)} пкс/мм</span>
						</div>
					)}
				</div>
			)}

			{/* Full report */}
			{aiReport && (
				<VisiographReportViewer
					report={aiReport}
					capturedAt={capturedAt}
					onInsertToProtocol={onInsertReportToProtocol}
				/>
			)}

			{/* Actions */}
			<VisiographBottomActions
				isHistoryView={isHistoryView}
				currentScan={currentScan}
				deletingScanId={deletingScanId}
				onClear={onClear}
				onDeleteScan={onDeleteScan}
			/>
		</>
	);
}
