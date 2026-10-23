/**
 * PerioDiagnosticsDynamicsCard.tsx — Карточка динамики лечения пародонта («Было / Стало»).
 * Архитектурный слой Layer 4: Diagnostics Card (Мандат 8b, <= 120 строк).
 */

import type { PerioDynamicsSummary } from "@dental/shared";
import { Activity, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import React from "react";

export interface PerioDiagnosticsDynamicsCardProps {
	readonly dynamics: PerioDynamicsSummary;
}

export const PerioDiagnosticsDynamicsCard: React.FC<PerioDiagnosticsDynamicsCardProps> = React.memo(({ dynamics }) => {
	const trendBadge = dynamics.overallTrend === "improved"
		? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
		: dynamics.overallTrend === "worsened"
			? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
			: "bg-teal-500/10 text-teal-400 border border-teal-500/20";

	return (
		<div className="col-span-1 md:col-span-2 p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2" data-testid="perio-dynamics-panel">
			<h5 className="font-bold text-[var(--ink)] flex items-center justify-between">
				<span className="flex items-center gap-1.5">
					<Activity size={14} className="text-teal-400" />
					<span>Динамика лечения пародонта («Было / Стало»)</span>
				</span>
				<span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${trendBadge}`}>
					{dynamics.trendLabelRu}
				</span>
			</h5>
			<p className="text-[11px] text-[var(--muted)]">{dynamics.summaryRu}</p>
			{dynamics.hasComparison && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[var(--muted)]">Кровоточивость BOP:</span>
						<div className={`font-bold flex items-center gap-1 ${dynamics.bopDiffPercent < 0 ? "text-emerald-400" : dynamics.bopDiffPercent > 0 ? "text-rose-400" : "text-[var(--ink)]"}`}>
							{dynamics.bopDiffPercent < 0 ? <ArrowDownRight size={14} /> : dynamics.bopDiffPercent > 0 ? <ArrowUpRight size={14} /> : <Minus size={14} />}
							<span>{dynamics.bopDiffPercent > 0 ? `+${dynamics.bopDiffPercent}` : dynamics.bopDiffPercent}%</span>
						</div>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[var(--muted)]">Карманы ≥ 5 мм:</span>
						<div className={`font-bold flex items-center gap-1 ${dynamics.deepPocketsDiffCount < 0 ? "text-emerald-400" : dynamics.deepPocketsDiffCount > 0 ? "text-rose-400" : "text-[var(--ink)]"}`}>
							{dynamics.deepPocketsDiffCount < 0 ? <ArrowDownRight size={14} /> : dynamics.deepPocketsDiffCount > 0 ? <ArrowUpRight size={14} /> : <Minus size={14} />}
							<span>{dynamics.deepPocketsDiffCount > 0 ? `+${dynamics.deepPocketsDiffCount}` : dynamics.deepPocketsDiffCount} шт.</span>
						</div>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[var(--muted)]">Ср. глубина карманов:</span>
						<div className={`font-bold flex items-center gap-1 ${dynamics.meanPocketDepthDiffMm < 0 ? "text-emerald-400" : dynamics.meanPocketDepthDiffMm > 0 ? "text-rose-400" : "text-[var(--ink)]"}`}>
							{dynamics.meanPocketDepthDiffMm < 0 ? <ArrowDownRight size={14} /> : dynamics.meanPocketDepthDiffMm > 0 ? <ArrowUpRight size={14} /> : <Minus size={14} />}
							<span>{dynamics.meanPocketDepthDiffMm > 0 ? `+${dynamics.meanPocketDepthDiffMm}` : dynamics.meanPocketDepthDiffMm} мм</span>
						</div>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[var(--muted)]">Индекс налета:</span>
						<div className={`font-bold flex items-center gap-1 ${dynamics.plaqueDiffPercent < 0 ? "text-emerald-400" : dynamics.plaqueDiffPercent > 0 ? "text-rose-400" : "text-[var(--ink)]"}`}>
							{dynamics.plaqueDiffPercent < 0 ? <ArrowDownRight size={14} /> : dynamics.plaqueDiffPercent > 0 ? <ArrowUpRight size={14} /> : <Minus size={14} />}
							<span>{dynamics.plaqueDiffPercent > 0 ? `+${dynamics.plaqueDiffPercent}` : dynamics.plaqueDiffPercent}%</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

PerioDiagnosticsDynamicsCard.displayName = "PerioDiagnosticsDynamicsCard";
