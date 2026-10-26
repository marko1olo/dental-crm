import React from "react";
import { formatHours, formatPercent } from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsChairsTableProps {
	readonly summary: ReportsSummary;
}

export function ManagerReportsChairsTable({
	summary,
}: ManagerReportsChairsTableProps) {
	return (
		<>
			<h3 className="ops-section-title">Занятость кресел</h3>
			{summary.chairs?.isEmpty ? (
				<p className="ops-empty">Приёмов за период не было.</p>
			) : (
				<>
					<div className="ops-table-wrap">
						<table className="ops-table">
							<thead>
								<tr>
									<th scope="col">Кресло</th>
									<th scope="col">Занято</th>
									<th scope="col">Приёмов</th>
									<th scope="col">Занятость</th>
								</tr>
							</thead>
							<tbody>
								{(summary.chairs?.rows ?? []).map((row, idx) => (
									<tr key={row?.chairId ?? row?.chairName ?? `chair-row-${idx}`}>
										<td className="ops-strong" data-label="Кресло">{row?.chairName ?? "—"}</td>
										<td className="ops-num" data-label="Занято">{formatHours(row?.bookedMinutes ?? 0)}</td>
										<td className="ops-num" data-label="Приёмов">{row?.appointments ?? 0}</td>
										<td className="ops-num" data-label="Занятость">{formatPercent(row?.utilization ?? null)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<p className="ops-hint">{summary.chairs?.basis?.note ?? ""}</p>
				</>
			)}
		</>
	);
}
