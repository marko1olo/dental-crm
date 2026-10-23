/**
 * PerioDiagnosticsPsrCard.tsx — Карточка секстантов PSR (СтАР / ВОЗ).
 * Архитектурный слой Layer 4: Diagnostics Card (Мандат 8b, <= 120 строк).
 */

import type { PsrSextantResult } from "@dental/shared";
import React from "react";

export interface PerioDiagnosticsPsrCardProps {
	readonly psrSummaryText: string;
	readonly psrSextants: Record<string, PsrSextantResult>;
}

export const PerioDiagnosticsPsrCard: React.FC<PerioDiagnosticsPsrCardProps> = React.memo(({
	psrSummaryText, psrSextants,
}) => {
	const sextants = [
		{ id: "S1", label: "S1 (17-14)" },
		{ id: "S2", label: "S2 (13-23)" },
		{ id: "S3", label: "S3 (24-27)" },
		{ id: "S6", label: "S6 (47-44)" },
		{ id: "S5", label: "S5 (43-33)" },
		{ id: "S4", label: "S4 (34-37)" },
	] as const;

	return (
		<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
			<h5 className="font-bold text-[var(--ink)] flex items-center justify-between">
				<span>Секстанты PSR (СтАР / ВОЗ)</span>
				<span className="text-teal-400 font-mono">{psrSummaryText}</span>
			</h5>
			<div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
				{sextants.map(({ id, label }) => {
					const s = psrSextants[id];
					return (
						<div key={id} className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="text-[var(--muted)]">{label}</div>
							<div className="font-bold text-base text-teal-300">
								{s?.code ?? 0}{s?.asterisk ? "*" : ""}
							</div>
							<div className="text-[10px] text-[var(--muted)]">PD: {s?.highestPocketDepthMm ?? 0}мм</div>
						</div>
					);
				})}
			</div>
			<p className="text-[10px] text-[var(--muted)]">
				* — патологическая подвижность зубов ≥ II ст. или вовлечение фуркации корней
			</p>
		</div>
	);
});

PerioDiagnosticsPsrCard.displayName = "PerioDiagnosticsPsrCard";
