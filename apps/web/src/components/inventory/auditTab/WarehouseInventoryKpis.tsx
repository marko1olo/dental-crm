import React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles, type InventoryAuditTotals } from "../warehouseInventoryEngine.js";

export const WarehouseInventoryKpis: React.FC<{ totals: InventoryAuditTotals }> = ({ totals }) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
			<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col">
				<span className="text-[11px] font-medium text-[var(--muted)]">Позиций в описи</span>
				<span className="text-lg font-bold text-[var(--ink)] leading-tight mt-0.5">{totals.totalItemsCount}</span>
				<span className="text-[11px] text-[var(--muted)]">Совпадений: {totals.matchedItemsCount}</span>
			</div>

			<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col">
				<span className="text-[11px] font-medium text-[var(--danger)]">Недостача к списанию</span>
				<span className="text-lg font-bold text-[var(--danger)] leading-tight mt-0.5">{totals.shortageItemsCount} поз.</span>
				<span className="text-[11px] text-[var(--danger)] font-medium">{money(kopecksToRubles(totals.totalShortageCostKopecks))}</span>
			</div>

			<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col">
				<span className="text-[11px] font-medium text-[var(--success)]">Излишки</span>
				<span className="text-lg font-bold text-[var(--success)] leading-tight mt-0.5">{totals.surplusItemsCount} поз.</span>
				<span className="text-[11px] text-[var(--success)] font-medium">{money(kopecksToRubles(totals.totalSurplusCostKopecks))}</span>
			</div>

			<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col">
				<span className="text-[11px] font-medium text-[var(--primary)]">Фактический баланс</span>
				<span className="text-lg font-bold text-[var(--primary)] leading-tight mt-0.5">{money(kopecksToRubles(totals.totalActualCostKopecks))}</span>
				<span className="text-[11px] text-[var(--muted)]">По результатам сверки</span>
			</div>
		</div>
	);
};

export default WarehouseInventoryKpis;
