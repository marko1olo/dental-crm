import type { OlearyPcrResult, PerioChartSummary } from "@dental/shared";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import React from "react";

export interface PerioSummaryBarProps {
	readonly summary: PerioChartSummary;
	readonly olearyPcr: OlearyPcrResult;
	readonly psrSummaryText: string;
	readonly isDiagnosticsExpanded: boolean;
	readonly onToggleDiagnostics: () => void;
}

export const PerioSummaryBar: React.FC<PerioSummaryBarProps> = React.memo(({
	summary,
	olearyPcr,
	psrSummaryText,
	isDiagnosticsExpanded,
	onToggleDiagnostics,
}) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
			{/* 1. FMBS (BOP %) */}
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
				<span className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1 min-w-0 truncate">
					<span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
					<span className="truncate">FMBS (BOP %)</span>
				</span>
				<div className="flex items-baseline gap-1.5 min-w-0">
					<span
						className={`text-lg font-black shrink-0 ${
							summary.fmbsPercent <= 10
								? "text-emerald-400"
								: summary.fmbsPercent <= 25
									? "text-amber-400"
									: "text-rose-400"
						}`}
					>
						{summary.fmbsPercent}%
					</span>
					<span className="text-[10px] text-[var(--muted)] truncate">
						{summary.fmbsPercent <= 10 ? "Норма ≤10%" : "Воспаление"}
					</span>
				</div>
			</div>

			{/* 2. FMPS (Plaque %) / O'Leary PCR */}
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
				<span className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1 min-w-0 truncate">
					<span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
					<span className="truncate">FMPS / O&apos;Leary</span>
				</span>
				<div className="flex items-baseline gap-1.5 min-w-0">
					<span
						className={`text-lg font-black shrink-0 ${
							olearyPcr.pcrPercent <= 15
								? "text-emerald-400"
								: olearyPcr.pcrPercent <= 30
									? "text-amber-400"
									: "text-rose-400"
						}`}
					>
						{olearyPcr.pcrPercent}%
					</span>
					<span className="text-[10px] text-[var(--muted)] truncate">
						{olearyPcr.isSurgicalClearanceMet ? "Допуск к оп." : "Тренинг гиг."}
					</span>
				</div>
			</div>

			{/* 3. Deep Pockets (PD >= 5 mm) */}
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
				<span className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1 min-w-0 truncate">
					<AlertCircle size={12} className="text-rose-400 shrink-0" />
					<span className="truncate">Карманы ≥ 5 мм</span>
				</span>
				<div className="flex items-baseline gap-1.5 min-w-0">
					<span
						className={`text-lg font-black shrink-0 ${
							summary.deepPocketsCount === 0
								? "text-emerald-400"
								: "text-rose-400"
						}`}
					>
						{summary.deepPocketsCount}
					</span>
					<span className="text-[10px] text-[var(--muted)] truncate">
						умеренных 4мм: {summary.moderatePocketsCount}
					</span>
				</div>
			</div>

			{/* 4. Max PD & Max CAL */}
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
				<span className="text-[11px] text-[var(--muted)] font-semibold truncate">
					Макс. PD / CAL
				</span>
				<div className="flex items-baseline gap-1.5 min-w-0">
					<span className="text-lg font-black text-[var(--ink)] shrink-0">
						{summary.maxPocketDepthMm} / {summary.maxCalMm}
					</span>
					<span className="text-[10px] text-[var(--muted)] truncate">мм</span>
				</div>
			</div>

			{/* 5. Mobility & Furcations */}
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
				<span className="text-[11px] text-[var(--muted)] font-semibold truncate">
					Подвижность / Фуркации
				</span>
				<div className="flex items-baseline gap-1.5 min-w-0">
					<span className="text-lg font-black text-amber-400 shrink-0">
						{summary.teethWithMobilityCount} / {summary.teethWithFurcationCount}
					</span>
					<span className="text-[10px] text-[var(--muted)] truncate">
						зубов
					</span>
				</div>
			</div>

			{/* 6. WHO PSR / CPITN Sextants Summary */}
			<div
				onClick={onToggleDiagnostics}
				className="p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] flex flex-col gap-0.5 cursor-pointer transition-all min-w-0"
				title="Нажмите для открытия подробного отчета по секстантам PSR и матрице O'Leary"
			>
				<div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-semibold min-w-0 gap-1">
					<span className="truncate">Скрининг PSR</span>
					{isDiagnosticsExpanded ? (
						<ChevronUp size={12} className="shrink-0" />
					) : (
						<ChevronDown size={12} className="shrink-0" />
					)}
				</div>
				<div className="font-mono text-xs font-bold text-teal-400 truncate">
					{psrSummaryText}
				</div>
			</div>
		</div>
	);
});

PerioSummaryBar.displayName = "PerioSummaryBar";
