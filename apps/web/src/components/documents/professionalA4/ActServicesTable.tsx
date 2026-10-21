import type React from "react";
import { formatRubles } from "@dental/shared";
import type { A4DocumentActData } from "@dental/shared";

export function ActServicesTable({
	actData,
}: {
	actData: A4DocumentActData;
}): React.JSX.Element {
	return (
		<table className="a4-table">
			<thead>
				<tr>
					<th style={{ width: "25px" }}>№</th>
					<th style={{ width: "75px" }}>Код услуги</th>
					<th>Наименование медицинской услуги</th>
					<th style={{ width: "55px" }}>Зуб</th>
					<th style={{ width: "35px" }}>Кол.</th>
					<th style={{ width: "70px" }}>Цена (руб.)</th>
					<th style={{ width: "60px" }}>Скидка</th>
					<th style={{ width: "75px" }}>Итого (руб.)</th>
				</tr>
			</thead>
			<tbody>
				{actData.services.map((s, idx) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed rows
					<tr key={idx}>
						<td style={{ textAlign: "center" }}>{idx + 1}</td>
						<td
							style={{
								textAlign: "center",
								fontFamily: "Courier New, monospace",
								fontWeight: "bold",
							}}
						>
							{s.code804n || "A16.07.002"}
						</td>
						<td>{s.name}</td>
						<td style={{ textAlign: "center" }}>{s.toothOrArea || "—"}</td>
						<td style={{ textAlign: "center" }}>{s.quantity}</td>
						<td style={{ textAlign: "right" }}>
							{formatRubles(s.unitPriceRub)}
						</td>
						<td style={{ textAlign: "right" }}>
							{s.discountRub ? formatRubles(s.discountRub) : "—"}
						</td>
						<td style={{ textAlign: "right", fontWeight: "bold" }}>
							{formatRubles(s.totalRub)}
						</td>
					</tr>
				))}
			</tbody>
			<tfoot>
				<tr className="total-row">
					<td colSpan={7} style={{ textAlign: "right" }}>
						ИТОГО К ОПЛАТЕ:
					</td>
					<td style={{ textAlign: "right", fontSize: "9.5pt" }}>
						{formatRubles(actData.totalAmountRub)}
					</td>
				</tr>
			</tfoot>
		</table>
	);
}
