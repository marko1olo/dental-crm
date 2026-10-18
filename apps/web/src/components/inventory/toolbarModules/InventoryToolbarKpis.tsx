import React from "react";

export interface InventoryToolbarKpisProps {
	readonly totalItems: number;
	readonly lowStockCount: number;
}

export const InventoryToolbarKpis: React.FC<InventoryToolbarKpisProps> = ({
	totalItems, lowStockCount,
}) => {
	return (
		<div className="hidden 2xl:flex items-center gap-1.5 text-xs text-[var(--ink-muted)] shrink-0 pl-2 border-l border-[var(--line)]">
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-medium shrink-0 whitespace-nowrap">
				Поз: <strong className="text-[var(--ink)] font-bold">{totalItems}</strong>
			</span>
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-medium shrink-0 whitespace-nowrap">
				Дефицит:{" "}
				<strong className={lowStockCount > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[var(--primary)] font-bold"}>
					{lowStockCount}
				</strong>
			</span>
		</div>
	);
};

export default InventoryToolbarKpis;
