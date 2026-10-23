/**
 * PerioMobileCockpitKpi.tsx — 4 ключевых индикатора пародонта для смартфона (BOP, PLQ, Карманы, Макс).
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import type { PerioChartSummary } from "@dental/shared";
import React from "react";

export interface PerioMobileCockpitKpiProps {
	readonly summary: PerioChartSummary;
}

export const PerioMobileCockpitKpi: React.FC<PerioMobileCockpitKpiProps> = React.memo(({ summary }) => {
	const bopColor = summary.fmbsPercent <= 10 ? "text-emerald-500" : summary.fmbsPercent <= 25 ? "text-amber-500" : "text-rose-500";
	const plqColor = summary.fmpsPercent <= 15 ? "text-emerald-500" : summary.fmpsPercent <= 30 ? "text-amber-500" : "text-rose-500";

	return (
		<div className="grid grid-cols-4 gap-1.5 w-full">
			<div className="p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
				<span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">Кровь (BOP)</span>
				<span className={`text-sm font-black ${bopColor}`}>{summary.fmbsPercent}%</span>
			</div>
			<div className="p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
				<span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">Налёт (PLQ)</span>
				<span className={`text-sm font-black ${plqColor}`}>{summary.fmpsPercent}%</span>
			</div>
			<div className="p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
				<span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">Карманы &ge;5</span>
				<span className={`text-sm font-black ${summary.deepPocketsCount === 0 ? "text-emerald-500" : "text-rose-500"}`}>{summary.deepPocketsCount}</span>
			</div>
			<div className="p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
				<span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">Макс карман</span>
				<span className="text-sm font-black text-[var(--ink)]">{summary.maxPocketDepthMm} мм</span>
			</div>
		</div>
	);
});

PerioMobileCockpitKpi.displayName = "PerioMobileCockpitKpi";
