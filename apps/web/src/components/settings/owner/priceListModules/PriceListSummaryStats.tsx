/**
 * PriceListSummaryStats.tsx
 *
 * 4 карточки сводной статистики прейскуранта владельца:
 * - Всего позиций
 * - Средняя рентабельность (%)
 * - Высокомаржинальные (>= 70%)
 * - Низкомаржинальные (< 50%)
 */

import React from "react";
import { countLabel } from "../../../../lib/russianPlural";
import type { PriceListStats } from "./priceListTypes";

export interface PriceListSummaryStatsProps {
	readonly stats: PriceListStats;
}

export const PriceListSummaryStats: React.FC<PriceListSummaryStatsProps> = ({ stats }) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<span className="text-[11px] text-[var(--muted)] block">Всего позиций в прейскуранте</span>
				<span className="text-lg font-bold text-[var(--ink)] mt-0.5 block">
					{countLabel(stats.totalServices, "услуга", "услуги", "услуг")}
				</span>
			</div>
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<span className="text-[11px] text-[var(--muted)] block">Средняя рентабельность</span>
				<span className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5 block">
					{stats.avgMarginPct}%
				</span>
			</div>
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<span className="text-[11px] text-[var(--muted)] block">Высокомаржинальные (&gt;=70%)</span>
				<span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
					{countLabel(stats.highMarginCount, "услуга", "услуги", "услуг")}
				</span>
			</div>
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<span className="text-[11px] text-[var(--muted)] block">Низкомаржинальные (&lt;50%)</span>
				<span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
					{countLabel(stats.lowMarginCount, "услуга", "услуги", "услуг")}
				</span>
			</div>
		</div>
	);
};
