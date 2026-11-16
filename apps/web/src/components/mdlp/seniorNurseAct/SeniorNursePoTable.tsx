import React from "react";
import type { SupplierPurchaseOrderView } from "../../inventory/inventoryMath.js";

export interface SeniorNursePoTableProps {
	readonly po: SupplierPurchaseOrderView;
}

export const SeniorNursePoTable: React.FC<SeniorNursePoTableProps> = ({ po }) => {
	return (
		<>
			<table className="w-full border-collapse text-xs">
				<thead>
					<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)]">
						<th className="p-2 text-left">Материал</th>
						<th className="p-2 text-center">Ед.</th>
						<th className="p-2 text-right">Остаток</th>
						<th className="p-2 text-right">К заказу</th>
						<th className="p-2 text-right">Сумма</th>
					</tr>
				</thead>
				<tbody>
					{po.items.map((item) => (
						<tr key={item.sku} className="border-b border-[var(--line)]">
							<td className="p-2 font-semibold">{item.materialName}</td>
							<td className="p-2 text-center">{item.unit}</td>
							<td className="p-2 text-right">{item.currentStock}</td>
							<td className="p-2 text-right font-bold text-[var(--primary)]">
								{item.suggestedOrderQuantity}
							</td>
							<td className="p-2 text-right font-semibold">
								{item.totalCostFormatted}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			<div className="mt-4 flex justify-end gap-5 text-sm font-bold">
				<div>Позиций: {po.totalItemsCount}</div>
				<div className="text-[var(--primary)]">Итого: {po.totalCostFormatted}</div>
			</div>
		</>
	);
};

export default SeniorNursePoTable;
