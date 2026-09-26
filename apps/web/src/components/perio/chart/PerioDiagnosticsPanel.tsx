import type { OlearyPcrSummary, PsrSextantResult } from "@dental/shared";
import { ChevronUp, Layers } from "lucide-react";
import React from "react";

export interface PerioDiagnosticsPanelProps {
	readonly isDiagnosticsExpanded: boolean;
	readonly onCloseDiagnostics: () => void;
	readonly psrSummaryText: string;
	readonly psrSextants: Record<string, PsrSextantResult>;
	readonly olearyPcr: OlearyPcrSummary;
}

export const PerioDiagnosticsPanel: React.FC<PerioDiagnosticsPanelProps> = React.memo(({
	isDiagnosticsExpanded,
	onCloseDiagnostics,
	psrSummaryText,
	psrSextants,
	olearyPcr,
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
			</div>
		</div>
	);
});

PerioDiagnosticsPanel.displayName = "PerioDiagnosticsPanel";
