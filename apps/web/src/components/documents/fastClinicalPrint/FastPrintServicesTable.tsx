import React from "react";
import type { FastPrintServiceItem } from "../FastClinicalPrintEngine";

export function FastPrintServicesTable({
	effectiveServices,
	computedTotal,
}: {
	effectiveServices: FastPrintServiceItem[];
	computedTotal: number;
}): React.JSX.Element {
	return (
		<table className="fast-print-table">
			<thead>
				<tr>
					<th style={{ width: "5%" }}>№</th>
					<th style={{ width: "15%" }}>Код услуги</th>
					<th style={{ width: "45%" }}>Наименование медицинской услуги</th>
					<th style={{ width: "8%" }}>Зуб</th>
					<th style={{ width: "7%" }}>Кол.</th>
					<th style={{ width: "10%" }}>Цена (₽)</th>
					<th style={{ width: "10%" }}>Сумма (₽)</th>
				</tr>
			</thead>
			<tbody>
				{effectiveServices.map((item, idx) => (
					<tr key={item.code || item.name || idx}>
						<td style={{ textAlign: "center" }}>{idx + 1}</td>
						<td style={{ fontSize: 10 }}>{item.code || "—"}</td>
						<td>{item.name}</td>
						<td style={{ textAlign: "center" }}>{item.tooth || "—"}</td>
						<td style={{ textAlign: "center" }}>{item.quantity}</td>
						<td style={{ textAlign: "right" }}>
							{item.price.toLocaleString("ru-RU")}
						</td>
						<td style={{ textAlign: "right", fontWeight: 600 }}>
							{(item.amount || item.price * item.quantity).toLocaleString(
								"ru-RU",
							)}
						</td>
					</tr>
				))}
				<tr className="fast-print-total-row">
					<td colSpan={6} style={{ textAlign: "right" }}>
						ИТОГО К ОПЛАТЕ:
					</td>
					<td style={{ textAlign: "right" }}>
						{computedTotal.toLocaleString("ru-RU")} ₽
					</td>
				</tr>
			</tbody>
		</table>
	);
}
