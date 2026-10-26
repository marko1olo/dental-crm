import type React from "react";
import { money } from "../../AppHelpers";
import type { ReceivablesDetail } from "./ManagerReportsTypes";

const RECEIVABLES_BUCKET_LABELS: Record<string, string> = {
	current: "До 7 дней",
	up_to_30: "До 30 дней",
	up_to_90: "До 90 дней",
	over_90: "Более 90 дней",
	undated: "Без даты",
};

export interface ManagerReportsDebtorsTableProps {
	readonly data: ReceivablesDetail;
}

export const ManagerReportsDebtorsTable: React.FC<ManagerReportsDebtorsTableProps> = ({
	data,
}) => {
	return (
		<>
			<div className="ops-table-wrap">
				<table className="ops-table">
					<caption className="sr-only">Пациенты с неоплаченным лечением</caption>
					<thead>
						<tr>
							<th scope="col">Пациент</th>
							<th scope="col">Долг</th>
							<th scope="col">Срок</th>
							<th scope="col">Первая позиция</th>
						</tr>
					</thead>
					<tbody>
						{(data.rows ?? []).map((row, idx) => (
							<tr key={row?.patientId ?? `debtor-row-${idx}`}>
								<td className="ops-strong" data-label="Пациент">{row?.patientName ?? "—"}</td>
								<td className="ops-num" data-label="Долг">{money(row.debtRub)}</td>
								<td data-label="Срок">{RECEIVABLES_BUCKET_LABELS[row.bucket] ?? row.bucket}</td>
								<td className="ops-num" data-label="Первая позиция">
									{row.oldestChargeAt === null
										? "дата не определена"
										: new Date(row.oldestChargeAt).toLocaleDateString("ru-RU")}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="ops-hint">
				Итого {money(data.totalDebtRub ?? 0)} у {(data.rows ?? []).length} пациент(ов). {data.note}
			</p>
		</>
	);
};
