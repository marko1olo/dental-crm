import type React from "react";
import { formatRubles } from "@dental/shared";
import type { A4DocumentContractData } from "@dental/shared";

export function ContractServicesTable({
	contractData,
}: {
	contractData: A4DocumentContractData;
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
					<th style={{ width: "75px" }}>Цена (руб.)</th>
					<th style={{ width: "75px" }}>Сумма (руб.)</th>
				</tr>
			</thead>
			<tbody>
				{contractData.services && contractData.services.length > 0 ? (
					contractData.services.map((s, idx) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed rows
						<tr key={idx}>
							<td style={{ textAlign: "center" }}>{idx + 1}</td>
							<td
								style={{
									textAlign: "center",
									fontFamily: "monospace",
									fontWeight: "bold",
								}}
							>
								{s.code804n || "—"}
							</td>
							<td>{s.name}</td>
							<td style={{ textAlign: "center" }}>{s.toothOrArea || "—"}</td>
							<td style={{ textAlign: "center" }}>{s.quantity}</td>
							<td style={{ textAlign: "right" }}>
								{formatRubles(s.unitPriceRub)}
							</td>
							<td style={{ textAlign: "right", fontWeight: "bold" }}>
								{formatRubles(s.totalRub)}
							</td>
						</tr>
					))
				) : (
					<tr>
						<td style={{ textAlign: "center" }}>1</td>
						<td style={{ textAlign: "center" }}>B01.065.001</td>
						<td>
							{contractData.serviceScopeSummary ||
								"Комплексные специализированные стоматологические медицинские услуги по плану лечения"}
						</td>
						<td style={{ textAlign: "center" }}>—</td>
						<td style={{ textAlign: "center" }}>1</td>
						<td style={{ textAlign: "right" }}>
							{formatRubles(contractData.estimatedTotalRub)}
						</td>
						<td style={{ textAlign: "right", fontWeight: "bold" }}>
							{formatRubles(contractData.estimatedTotalRub)}
						</td>
					</tr>
				)}
			</tbody>
			<tfoot>
				<tr className="total-row">
					<td colSpan={6} style={{ textAlign: "right" }}>
						ИТОГО К ОПЛАТЕ ПО СМЕТЕ:
					</td>
					<td style={{ textAlign: "right" }}>
						{formatRubles(contractData.estimatedTotalRub)}
					</td>
				</tr>
			</tfoot>
		</table>
	);
}
