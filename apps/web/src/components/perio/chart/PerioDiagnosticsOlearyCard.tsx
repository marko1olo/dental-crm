/**
 * PerioDiagnosticsOlearyCard.tsx — Карточка индекса гигиены O'Leary PCR.
 * Архитектурный слой Layer 4: Diagnostics Card (Мандат 8b, <= 120 строк).
 */

import type { OlearyPcrSummary } from "@dental/shared";
import React from "react";

export interface PerioDiagnosticsOlearyCardProps {
	readonly olearyPcr: OlearyPcrSummary;
}

export const PerioDiagnosticsOlearyCard: React.FC<PerioDiagnosticsOlearyCardProps> = React.memo(({ olearyPcr }) => {
	const pcrColor = olearyPcr.pcrPercent <= 15 ? "text-emerald-400" : "text-rose-400";

	return (
		<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
			<h5 className="font-bold text-[var(--ink)] flex items-center justify-between">
				<span>Индекс гигиены O&apos;Leary PCR</span>
				<span className={`font-mono font-bold ${pcrColor}`}>{olearyPcr.pcrPercent}%</span>
			</h5>
			<p className="text-[11px] text-[var(--muted)]">{olearyPcr.ratingDescriptionRu}</p>
			<div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
				<div className="p-2 rounded bg-[var(--paper-soft)]">
					<span className="text-[var(--muted)]">Апроксимальный налет:</span>
					<div className="font-bold text-amber-300">{olearyPcr.interproximalPlaquePercent}%</div>
				</div>
				<div className="p-2 rounded bg-[var(--paper-soft)]">
					<span className="text-[var(--muted)]">Гладкие поверхности:</span>
					<div className="font-bold text-amber-300">{olearyPcr.smoothSurfacePlaquePercent}%</div>
				</div>
			</div>
		</div>
	);
});

PerioDiagnosticsOlearyCard.displayName = "PerioDiagnosticsOlearyCard";
