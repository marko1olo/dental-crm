/**
 * ChairsideServiceHeader.tsx
 * Service item title, tooth badge, 804n code and ZTL lab order chip.
 */

import React from "react";
import type { VisitBillingServiceItem } from "./visitBillingTypes.js";

interface ChairsideServiceHeaderProps {
	item: VisitBillingServiceItem;
	index: number;
}

export const ChairsideServiceHeader: React.FC<ChairsideServiceHeaderProps> = ({ item, index }) => {
	return (
		<div className="flex items-center gap-2 flex-wrap">
			<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">#{index + 1}</span>
			{item.toothCode ? (
				<span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
					{item.toothCode.includes(",") ? `зубы ${item.toothCode}` : `зуб ${item.toothCode}`}
				</span>
			) : (
				<span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
					Общая
				</span>
			)}
			{item.code804n && (
				<span className="text-xs font-mono font-semibold text-[var(--muted,#64748b)]">[{item.code804n}]</span>
			)}
			<span className="text-xs font-bold text-[var(--ink,#0f172a)] break-words">{item.title}</span>
			{item.labOrderNumber ? (
				<span
					className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
					data-testid={`chairside-lab-order-chip-${item.id}`}
				>
					Наряд: {item.labOrderNumber}
				</span>
			) : null}
			{item.labCostRub && item.labCostRub > 0 ? (
				<span
					className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
					data-testid={`lab-cost-chip-${item.id}`}
					title="Себестоимость изготовления в зуботехнической лаборатории"
				>
					ЗТЛ: {item.labCostRub.toLocaleString("ru-RU")} ₽
				</span>
			) : null}
		</div>
	);
};
