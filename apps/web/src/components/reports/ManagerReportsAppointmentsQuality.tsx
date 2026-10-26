import React from "react";
import {
	appointmentStatusLabels,
	formatPercent,
} from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";
import { safeDivide } from "./reportsCsvExport";

export interface ManagerReportsAppointmentsQualityProps {
	readonly summary: ReportsSummary;
}

export function ManagerReportsAppointmentsQuality({
	summary,
}: ManagerReportsAppointmentsQualityProps) {
	const apts = summary.appointments;
	return (
		<>
			<h3 className="ops-section-title">Приёмы</h3>
			<p>
				Дошли до кресла: {formatPercent(apts?.arrivalRate ?? null)} · завершено:{" "}
				{formatPercent(apts?.completionRate ?? null)} · отменено:{" "}
				{formatPercent(apts?.cancellationRate ?? null)} · неявки:{" "}
				{formatPercent(apts?.noShowRate ?? null)}
			</p>
			<p className="ops-hint">
				Доли считаются от всех {apts?.total ?? 0} записей периода.
				Остаток до 100 % — приёмы, которые ещё не состоялись: назначены на будущее или ждут подтверждения.
			</p>

			{Object.keys(apts?.byStatus ?? {}).length > 0 && (
				<div
					className="ops-table-wrap"
					data-testid="manager-reports-appointments-by-status"
				>
					<table className="ops-table">
						<caption className="sr-only">Число записей периода по статусу</caption>
						<thead>
							<tr>
								<th scope="col">Статус</th>
								<th scope="col">Записей</th>
								<th scope="col">Доля</th>
							</tr>
						</thead>
						<tbody>
							{Object.entries(apts?.byStatus ?? {})
								.filter(([, count]) => count > 0)
								.sort((a, b) => b[1] - a[1])
								.map(([status, count]) => {
									const share = safeDivide(count, apts?.total, null);
									return (
										<tr key={status}>
											<td className="ops-strong" data-label="Статус">
												{appointmentStatusLabels[status] ?? status}
											</td>
											<td className="ops-num" data-label="Записей">
												{count}
											</td>
											<td className="ops-num" data-label="Доля">
												{formatPercent(share)}
											</td>
										</tr>
									);
								})}
						</tbody>
					</table>
				</div>
			)}
		</>
	);
}
