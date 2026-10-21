import type React from "react";
import { formatRubCurrency, type WarehouseTransferTotals } from "./warehouseTransferEngine.js";

export interface WarehouseTransferSummaryBarProps {
	readonly totals: WarehouseTransferTotals;
}

export const WarehouseTransferSummaryBar: React.FC<WarehouseTransferSummaryBarProps> = ({
	totals,
}) => {
	return (
		<div className="wh-summary-bar">
			<div className="flex flex-col">
				<span className="text-xs font-semibold text-muted uppercase">Всего отпущено</span>
				<span className="text-lg font-black text-ink">{totals.totalDispatchedQuantity} ед.</span>
			</div>

			<div className="flex flex-col">
				<span className="text-xs font-semibold text-muted uppercase">Сумма по накладной</span>
				<span className="text-xl font-extrabold text-teal-dark">
					{formatRubCurrency(totals.totalDispatchedCostKopecks, true)}
				</span>
			</div>

			<div className="flex flex-col">
				<span className="text-xs font-semibold text-muted uppercase">Фактически принято</span>
				<span className="text-lg font-black text-ink">{totals.totalReceivedQuantity} ед.</span>
			</div>

			<div className="flex flex-col">
				<span className="text-xs font-semibold uppercase text-bad-fg">Сумма расхождений</span>
				<span className="text-lg font-black text-bad-fg">
					{totals.hasDiscrepancy
						? formatRubCurrency(totals.totalDiscrepancyDamageKopecks, true)
						: "0,00 ₽"}
				</span>
			</div>
		</div>
	);
};
