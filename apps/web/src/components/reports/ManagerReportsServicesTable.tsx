import type React from "react";
import { money } from "../../AppHelpers";
import type { ServiceSalesReport } from "./ManagerReportsTypes";

export interface ManagerReportsServicesTableProps {
	readonly data: ServiceSalesReport;
}

export const ManagerReportsServicesTable: React.FC<ManagerReportsServicesTableProps> = ({
	data,
}) => {
	return (
		<>
			<div className="ops-table-wrap">
				<table className="ops-table">
					<thead>
						<tr>
							<th scope="col">Услуга</th>
							<th scope="col">Количество</th>
							<th scope="col">Назначено</th>
							<th scope="col">Средняя цена</th>
							<th scope="col">Скидка</th>
						</tr>
					</thead>
					<tbody>
						{(data.rows ?? []).map((row, idx) => (
							<tr key={row?.title ?? `srv-row-${idx}`}>
								<td className="ops-strong" data-label="Услуга">{row?.title ?? "—"}</td>
								<td className="ops-num" data-label="Количество">{row.quantity}</td>
								<td className="ops-num" data-label="Назначено">{money(row.plannedRub)}</td>
								<td className="ops-num" data-label="Средняя цена">{money(row.averagePriceRub)}</td>
								<td className="ops-num" data-label="Скидка">
									{row.discountRub > 0 ? money(row.discountRub) : "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="ops-hint">
				Назначено всего {money(data.plannedTotalRub ?? 0)}, из них отдано скидками{" "}
				{money(data.discountTotalRub ?? 0)}. {data.note}
			</p>
		</>
	);
};
