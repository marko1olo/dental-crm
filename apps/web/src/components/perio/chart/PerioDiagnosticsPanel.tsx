import type {
	OlearyPcrSummary,
	PerioDynamicsSummary,
	PsrSextantResult,
} from "@dental/shared";
import {
	Activity,
	ArrowDownRight,
	ArrowUpRight,
	ChevronUp,
	Layers,
	Minus,
} from "lucide-react";
import React from "react";

export interface PerioDiagnosticsPanelProps {
	readonly isDiagnosticsExpanded: boolean;
	readonly onCloseDiagnostics: () => void;
	readonly psrSummaryText: string;
	readonly psrSextants: Record<string, PsrSextantResult>;
	readonly olearyPcr: OlearyPcrSummary;
	readonly dynamics?: PerioDynamicsSummary | undefined;
}

export const PerioDiagnosticsPanel: React.FC<PerioDiagnosticsPanelProps> = React.memo(({
	isDiagnosticsExpanded,
	onCloseDiagnostics,
	psrSummaryText,
	psrSextants,
	olearyPcr,
	dynamics,
}) => {
	if (!isDiagnosticsExpanded) return null;

	return (
		<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-teal-500/20 flex flex-col gap-4 animate-in fade-in duration-150">
			<div className="flex items-center justify-between font-bold text-sm text-teal-400">
				<span className="flex items-center gap-2">
					<Layers size={16} />
					Скрининг PSR / CPITN по 6 секстантам и гигиеническая матрица O&apos;Leary
					PCR
				</span>
				<button
					type="button"
					onClick={onCloseDiagnostics}
					className="min-h-[44px] px-2.5 py-1.5 rounded-lg text-[var(--muted)] hover:text-white hover:bg-[var(--line)]/30 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors touch-manipulation"
				>
					<span>Свернуть</span>
					<ChevronUp size={14} />
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
				{/* 6 Sextants WHO PSR */}
				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
					<h5 className="font-bold text-[var(--ink)] flex items-center justify-between">
						<span>Секстанты PSR (СтАР / ВОЗ)</span>
						<span className="text-teal-400 font-mono">{psrSummaryText}</span>
					</h5>
					<div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
						<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="text-[var(--muted)]">S1 (17-14)</div>
							<div className="font-bold text-base text-teal-300">
								{psrSextants.S1?.code ?? 0}
								{psrSextants.S1?.asterisk ? "*" : ""}
							</div>
							<div className="text-[10px] text-[var(--muted)]">
								PD: {psrSextants.S1?.highestPocketDepthMm ?? 0}мм
							</div>
						</div>
						<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="text-[var(--muted)]">S2 (13-23)</div>
							<div className="font-bold text-base text-teal-300">
								{psrSextants.S2?.code ?? 0}
								{psrSextants.S2?.asterisk ? "*" : ""}
							</div>
							<div className="text-[10px] text-[var(--muted)]">
								PD: {psrSextants.S2?.highestPocketDepthMm ?? 0}мм
							</div>
						</div>
						<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="text-[var(--muted)]">S3 (24-27)</div>
							<div className="font-bold text-base text-teal-300">
								{psrSextants.S3?.code ?? 0}
								{psrSextants.S3?.asterisk ? "*" : ""}
							</div>
							<div className="text-[10px] text-[var(--muted)]">
								PD: {psrSextants.S3?.highestPocketDepthMm ?? 0}мм
							</div>
						</div>
						<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="text-[var(--muted)]">S6 (47-44)</div>
							<div className="font-bold text-base text-teal-300">
								{psrSextants.S6?.code ?? 0}
								{psrSextants.S6?.asterisk ? "*" : ""}
							</div>
							<div className="text-[10px] text-[var(--muted)]">
								PD: {psrSextants.S6?.highestPocketDepthMm ?? 0}мм
							</div>
						</div>
						<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="text-[var(--muted)]">S5 (43-33)</div>
							<div className="font-bold text-base text-teal-300">
								{psrSextants.S5?.code ?? 0}
								{psrSextants.S5?.asterisk ? "*" : ""}
							</div>
							<div className="text-[10px] text-[var(--muted)]">
								PD: {psrSextants.S5?.highestPocketDepthMm ?? 0}мм
							</div>
						</div>
						<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="text-[var(--muted)]">S4 (34-37)</div>
							<div className="font-bold text-base text-teal-300">
								{psrSextants.S4?.code ?? 0}
								{psrSextants.S4?.asterisk ? "*" : ""}
							</div>
							<div className="text-[10px] text-[var(--muted)]">
								PD: {psrSextants.S4?.highestPocketDepthMm ?? 0}мм
							</div>
						</div>
					</div>
					<p className="text-[10px] text-[var(--muted)]">
						* — патологическая подвижность зубов ≥ II ст. или вовлечение
						фуркации корней
					</p>
				</div>

				{/* O'Leary Hygiene Report */}
				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
					<h5 className="font-bold text-[var(--ink)] flex items-center justify-between">
						<span>Индекс гигиены O&apos;Leary PCR</span>
						<span
							className={`font-mono font-bold ${
								olearyPcr.pcrPercent <= 15
									? "text-emerald-400"
									: "text-rose-400"
							}`}
						>
							{olearyPcr.pcrPercent}%
						</span>
					</h5>
					<p className="text-[11px] text-[var(--muted)]">
						{olearyPcr.ratingDescriptionRu}
					</p>
					<div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
						<div className="p-2 rounded bg-[var(--paper-soft)]">
							<span className="text-[var(--muted)]">
								Апроксимальный налет:
							</span>
							<div className="font-bold text-amber-300">
								{olearyPcr.interproximalPlaquePercent}%
							</div>
						</div>
						<div className="p-2 rounded bg-[var(--paper-soft)]">
							<span className="text-[var(--muted)]">
								Гладкие поверхности:
							</span>
							<div className="font-bold text-amber-300">
								{olearyPcr.smoothSurfacePlaquePercent}%
							</div>
						</div>
					</div>
				</div>

				{/* Visit Dynamics ("Было / Стало") */}
				{dynamics && (
					<div
						className="col-span-1 md:col-span-2 p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2"
						data-testid="perio-dynamics-panel"
					>
						<h5 className="font-bold text-[var(--ink)] flex items-center justify-between">
							<span className="flex items-center gap-1.5">
								<Activity size={14} className="text-teal-400" />
								<span>Динамика лечения пародонта («Было / Стало»)</span>
							</span>
							<span
								className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
									dynamics.overallTrend === "improved"
										? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
										: dynamics.overallTrend === "worsened"
											? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
											: "bg-teal-500/10 text-teal-400 border border-teal-500/20"
								}`}
							>
								{dynamics.trendLabelRu}
							</span>
						</h5>
						<p className="text-[11px] text-[var(--muted)]">
							{dynamics.summaryRu}
						</p>
						{dynamics.hasComparison && (
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<span className="text-[var(--muted)]">Кровоточивость BOP:</span>
									<div
										className={`font-bold flex items-center gap-1 ${
											dynamics.bopDiffPercent < 0
												? "text-emerald-400"
												: dynamics.bopDiffPercent > 0
													? "text-rose-400"
													: "text-[var(--ink)]"
										}`}
									>
										{dynamics.bopDiffPercent < 0 ? (
											<ArrowDownRight size={14} />
										) : dynamics.bopDiffPercent > 0 ? (
											<ArrowUpRight size={14} />
										) : (
											<Minus size={14} />
										)}
										<span>{dynamics.bopDiffPercent > 0 ? `+${dynamics.bopDiffPercent}` : dynamics.bopDiffPercent}%</span>
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<span className="text-[var(--muted)]">Карманы ≥ 5 мм:</span>
									<div
										className={`font-bold flex items-center gap-1 ${
											dynamics.deepPocketsDiffCount < 0
												? "text-emerald-400"
												: dynamics.deepPocketsDiffCount > 0
													? "text-rose-400"
													: "text-[var(--ink)]"
										}`}
									>
										{dynamics.deepPocketsDiffCount < 0 ? (
											<ArrowDownRight size={14} />
										) : dynamics.deepPocketsDiffCount > 0 ? (
											<ArrowUpRight size={14} />
										) : (
											<Minus size={14} />
										)}
										<span>{dynamics.deepPocketsDiffCount > 0 ? `+${dynamics.deepPocketsDiffCount}` : dynamics.deepPocketsDiffCount} шт.</span>
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<span className="text-[var(--muted)]">Ср. глубина карманов:</span>
									<div
										className={`font-bold flex items-center gap-1 ${
											dynamics.meanPocketDepthDiffMm < 0
												? "text-emerald-400"
												: dynamics.meanPocketDepthDiffMm > 0
													? "text-rose-400"
													: "text-[var(--ink)]"
										}`}
									>
										{dynamics.meanPocketDepthDiffMm < 0 ? (
											<ArrowDownRight size={14} />
										) : dynamics.meanPocketDepthDiffMm > 0 ? (
											<ArrowUpRight size={14} />
										) : (
											<Minus size={14} />
										)}
										<span>{dynamics.meanPocketDepthDiffMm > 0 ? `+${dynamics.meanPocketDepthDiffMm}` : dynamics.meanPocketDepthDiffMm} мм</span>
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<span className="text-[var(--muted)]">Индекс налета:</span>
									<div
										className={`font-bold flex items-center gap-1 ${
											dynamics.plaqueDiffPercent < 0
												? "text-emerald-400"
												: dynamics.plaqueDiffPercent > 0
													? "text-rose-400"
													: "text-[var(--ink)]"
										}`}
									>
										{dynamics.plaqueDiffPercent < 0 ? (
											<ArrowDownRight size={14} />
										) : dynamics.plaqueDiffPercent > 0 ? (
											<ArrowUpRight size={14} />
										) : (
											<Minus size={14} />
										)}
										<span>{dynamics.plaqueDiffPercent > 0 ? `+${dynamics.plaqueDiffPercent}` : dynamics.plaqueDiffPercent}%</span>
									</div>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
});

PerioDiagnosticsPanel.displayName = "PerioDiagnosticsPanel";
