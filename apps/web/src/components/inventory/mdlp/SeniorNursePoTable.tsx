import React from "react";
import type { SupplierPurchaseOrderView } from "../inventoryMath.js";

export interface SeniorNursePoTableProps {
	readonly po: SupplierPurchaseOrderView;
}

export const SeniorNursePoTable: React.FC<SeniorNursePoTableProps> = ({ po }) => {
	return (
		<>
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
				<thead>
					<tr style={{ background: "var(--paper-soft)", borderBottom: "1px solid var(--line)" }}>
						<th style={{ padding: "6px 8px", textAlign: "left" }}>Материал</th>
						<th style={{ padding: "6px 8px", textAlign: "center" }}>Ед.</th>
						<th style={{ padding: "6px 8px", textAlign: "right" }}>Остаток</th>
						<th style={{ padding: "6px 8px", textAlign: "right" }}>К заказу</th>
						<th style={{ padding: "6px 8px", textAlign: "right" }}>Сумма</th>
					</tr>
				</thead>
				<tbody>
					{po.items.map((item) => (
						<tr key={item.sku} style={{ borderBottom: "1px solid var(--line)" }}>
							<td style={{ padding: "6px 8px", fontWeight: 600 }}>{item.materialName}</td>
							<td style={{ padding: "6px 8px", textAlign: "center" }}>{item.unit}</td>
							<td style={{ padding: "6px 8px", textAlign: "right" }}>{item.currentStock}</td>
							<td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--teal-dark, #0f766e)" }}>
								{item.suggestedOrderQuantity}
							</td>
							<td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>
								{item.totalCostFormatted}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			<div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 20, fontSize: 14, fontWeight: 700 }}>
				<div>Позиций: {po.totalItemsCount}</div>
				<div style={{ color: "var(--teal-dark, #0f766e)" }}>Итого: {po.totalCostFormatted}</div>
			</div>
		</>
	);
};
