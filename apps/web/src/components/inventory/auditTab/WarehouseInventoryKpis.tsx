import React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles, type InventoryAuditTotals } from "../warehouseInventoryEngine.js";

export const WarehouseInventoryKpis: React.FC<{ totals: InventoryAuditTotals }> = ({ totals }) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
			<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col">
				<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Позиций в описи</span>
				<span className="text-lg font-bold text-[var(--ink)] leading-tight mt-0.5">{totals.totalItemsCount}</span>
				<span className="text-[11px] text-[var(--muted)]">Совпадений: {totals.matchedItemsCount}</span>
			</div>

			<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col">
				<span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Недостача к списанию</span>
				<span className="text-lg font-bold text-rose-600 dark:text-rose-400 leading-tight mt-0.5">{totals.shortageItemsCount} поз.</span>
				<span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">{money(kopecksToRubles(totals.totalShortageCostKopecks))}</span>
			</div>

			<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col">
				<span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Излишки</span>
				<span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">{totals.surplusItemsCount} поз.</span>
				<span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">{money(kopecksToRubles(totals.totalSurplusCostKopecks))}</span>
			</div>

			<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col">
				<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Фактический баланс</span>
				<span className="text-lg font-bold text-teal-700 dark:text-teal-300 leading-tight mt-0.5">{money(kopecksToRubles(totals.totalActualCostKopecks))}</span>
				<span className="text-[11px] text-[var(--muted)]">По результатам сверки</span>
			</div>
		</div>
	);
};

export default WarehouseInventoryKpis;
