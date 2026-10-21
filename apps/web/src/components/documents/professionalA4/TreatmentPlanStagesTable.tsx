import type React from "react";
import { formatRubles } from "@dental/shared";
import type { A4DocumentTreatmentPlanData } from "@dental/shared";

export function TreatmentPlanStagesTable({
	stages,
}: {
	stages: A4DocumentTreatmentPlanData["stages"];
}): React.JSX.Element {
	return (
		<>
			{stages.map((st) => (
				<div key={st.stageNumber} style={{ marginTop: "4px" }}>
					<div
						style={{
							fontWeight: "bold",
							fontSize: "9pt",
							background: "#eeeeee",
							border: "0.75pt solid #000000",
							padding: "3px 6px",
							borderBottom: "none",
						}}
					>
						{st.stageName}{" "}
						{st.stageTiming ? `(Ориентировочный срок: ${st.stageTiming})` : ""}
					</div>
					<table className="a4-table" style={{ marginTop: 0 }}>
						<thead>
							<tr>
								<th style={{ width: "25px" }}>№</th>
								<th>Наименование медицинской процедуры</th>
								<th style={{ width: "65px" }}>Зуб / область</th>
								<th style={{ width: "90px" }}>Сроки</th>
								<th style={{ width: "85px" }}>Стоимость (руб.)</th>
							</tr>
						</thead>
						<tbody>
							{st.plannedServices.map((srv, sIdx) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed stage rows
								<tr key={sIdx}>
									<td style={{ textAlign: "center" }}>
										{st.stageNumber}.{sIdx + 1}
									</td>
									<td>{srv.name}</td>
									<td style={{ textAlign: "center" }}>
										{srv.toothOrArea || "—"}
									</td>
									<td style={{ textAlign: "center" }}>
										{srv.timing || st.stageTiming || "по плану"}
									</td>
									<td style={{ textAlign: "right", fontWeight: "bold" }}>
										{formatRubles(srv.priceRub)}
									</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr className="total-row">
								<td colSpan={4} style={{ textAlign: "right" }}>
									Итого по этапу:
								</td>
								<td style={{ textAlign: "right" }}>
									{formatRubles(st.stageTotalRub)}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			))}
		</>
	);
}
