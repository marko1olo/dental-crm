import React from "react";
import { money } from "../../AppHelpers";
import { formatPercent } from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsDoctorsTableProps {
	readonly summary: ReportsSummary;
}

export function ManagerReportsDoctorsTable({
	summary,
}: ManagerReportsDoctorsTableProps) {
	return (
		<>
			<h3 className="ops-section-title">Врачи</h3>
			{summary.doctors?.isEmpty ? (
				<p className="ops-empty">Выработки за период нет.</p>
			) : (
				<>
					<div className="ops-table-wrap">
						<table className="ops-table">
							<thead>
								<tr>
									<th scope="col">Врач</th>
									<th scope="col">Получено</th>
									<th scope="col">Приёмов</th>
									<th scope="col">Завершено</th>
									<th scope="col">Неявки</th>
									<th scope="col">Средний чек</th>
									<th scope="col">Маржа</th>
								</tr>
							</thead>
							<tbody>
								{(summary.doctors?.rows ?? []).map((row, idx) => (
									<tr key={row?.doctorUserId ?? row?.doctorName ?? `doc-row-${idx}`}>
										<td className="ops-strong" data-label="Врач">{row?.doctorName ?? "—"}</td>
										<td className="ops-num" data-label="Получено">{money(row?.revenueRub ?? 0)}</td>
										<td className="ops-num" data-label="Приёмов">{row?.appointmentsTotal ?? 0}</td>
										<td className="ops-num" data-label="Завершено">
											{row?.appointmentsCompleted ?? 0} ({formatPercent(row?.completionRate ?? null)})
										</td>
										<td className="ops-num" data-label="Неявки">
											{row?.appointmentsNoShow ?? 0} ({formatPercent(row?.noShowRate ?? null)})
										</td>
										<td className="ops-num" data-label="Средний чек">
											{row?.averageTicketRub === null || row?.averageTicketRub === undefined
												? "—"
												: money(row.averageTicketRub)}
										</td>
										<td className="ops-num" data-label="Маржа" title="Маржа по врачу смотрите в разделе «Выплаты врачам»">—</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(summary.doctors?.unattributedRevenueRub ?? 0) > 0 ? (
						<p className="ops-hint">
							Не отнесено к врачу: {money(summary.doctors?.unattributedRevenueRub ?? 0)}. {summary.doctors?.attributionNote}
						</p>
					) : null}
				</>
			)}
		</>
	);
}
