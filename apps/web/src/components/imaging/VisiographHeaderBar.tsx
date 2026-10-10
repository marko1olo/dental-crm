import { AlertTriangle, Printer, Sparkles } from "lucide-react";
import React from "react";
import "../visit/VisitDiagnosticsTab.css";

export interface VisiographHeaderBarProps {
	readonly scanHistoryCount: number;
	readonly isLoadingHistory: boolean;
	readonly criticalCount: number;
	readonly historyFailure: { status: number | null } | string | null;
	readonly hasAiReport: boolean;
	readonly onUploadClick?: () => void;
	readonly onPrintClick: () => void;
	readonly onClearClick?: () => void;
	readonly currentImage?: string | null;
	readonly activeScan?: unknown;
	readonly hasActiveScan?: boolean;
}

export function VisiographHeaderBar({
	scanHistoryCount,
	isLoadingHistory,
	criticalCount,
	historyFailure,
	hasAiReport,
	onUploadClick,
	onPrintClick,
	onClearClick,
	currentImage,
	activeScan,
	hasActiveScan,
}: VisiographHeaderBarProps) {
	const hasScanOrImage = Boolean(hasActiveScan || activeScan || currentImage);

	const hasStatusInfo =
		scanHistoryCount > 0 ||
		isLoadingHistory ||
		criticalCount > 0 ||
		(historyFailure && !hasScanOrImage) ||
		hasAiReport;

	if (!hasStatusInfo && hasScanOrImage) {
		return null;
	}

	return (
		<div
			className="visiograph-header-bar flex items-center justify-between px-2.5 py-1 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] text-xs text-[var(--ink)] gap-2 flex-wrap"
			style={{ minHeight: "28px" }}
		>
			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1 text-[var(--teal)] font-semibold text-[11.5px]">
					<Sparkles size={13} />
					<span>Dental AI</span>
				</div>

				{(scanHistoryCount > 0 || isLoadingHistory) && (
					<span
						className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30"
						title="Снимков в архиве пациента"
					>
						{isLoadingHistory ? "Загрузка архива…" : `${scanHistoryCount} в архиве`}
					</span>
				)}

				{criticalCount > 0 && (
					<span
						className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30"
					>
						{criticalCount} проблем
					</span>
				)}

				{historyFailure && !hasScanOrImage && (
					<span
						className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--warn-fg,orange)]"
					>
						<AlertTriangle size={12} /> Ожидание снимка для анализа
					</span>
				)}
			</div>

			{hasAiReport && (
				<button
					type="button"
					onClick={onPrintClick}
					title="Печать отчёта снимка"
					aria-label="Печать отчёта снимка"
					className="diag-btn h-6 px-2 text-[11px] flex items-center gap-1 shrink-0"
				>
					<Printer size={12} />
					<span>Печать</span>
				</button>
			)}
		</div>
	);
}
