/**
 * Разрезы по врачам и занятости кресел в отчётах управляющего.
 */

import React from "react";
import { money } from "../../AppHelpers";
import { formatHours, formatPercent } from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsStaffAndChairsSectionProps {
	readonly summary: ReportsSummary;
	readonly showDoctorBreakdown: boolean;
	readonly showChairUtilisation: boolean;
}

export function ManagerReportsStaffAndChairsSection({
	summary,
	showDoctorBreakdown,
	showChairUtilisation,
}: ManagerReportsStaffAndChairsSectionProps) {
	return (
		<>
			{/* ── Врачи ─────────────────────────────────────────────── */}
			{showDoctorBreakdown ? (
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
											<tr
												key={
													row?.doctorUserId ??
													row?.doctorName ??
													`doc-row-${idx}`
												}
											>
												<td className="ops-strong" data-label="Врач">
													{row?.doctorName ?? "—"}
												</td>
												<td className="ops-num" data-label="Получено">
													{money(row?.revenueRub ?? 0)}
												</td>
												<td className="ops-num" data-label="Приёмов">
													{row?.appointmentsTotal ?? 0}
												</td>
												<td className="ops-num" data-label="Завершено">
													{row?.appointmentsCompleted ?? 0} (
													{formatPercent(row?.completionRate ?? null)})
												</td>
												<td className="ops-num" data-label="Неявки">
													{row?.appointmentsNoShow ?? 0} (
													{formatPercent(row?.noShowRate ?? null)})
												</td>
												<td className="ops-num" data-label="Средний чек">
													{row?.averageTicketRub === null ||
													row?.averageTicketRub === undefined
														? "—"
														: money(row.averageTicketRub)}
												</td>
												<td
													className="ops-num"
													data-label="Маржа"
													title="Маржа по врачу не считается здесь: смотрите блок «Выплаты врачам» ниже — там касса, ставка врача и удержание за материалы за выбранный зарплатный месяц"
												>
													—
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{(summary.doctors?.unattributedRevenueRub ?? 0) > 0 ? (
								<p className="ops-hint">
									Не отнесено к врачу:{" "}
									{money(summary.doctors?.unattributedRevenueRub ?? 0)}.{" "}
									{summary.doctors?.attributionNote}
								</p>
							) : null}
						</>
					)}
				</>
			) : null}

			{/* ── Кресла ────────────────────────────────────────────── */}
			{showChairUtilisation ? (
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
											<tr
												key={
													row?.chairId ?? row?.chairName ?? `chair-row-${idx}`
												}
											>
												<td className="ops-strong" data-label="Кресло">
													{row?.chairName ?? "—"}
												</td>
												<td className="ops-num" data-label="Занято">
													{formatHours(row?.bookedMinutes ?? 0)}
												</td>
												<td className="ops-num" data-label="Приёмов">
													{row?.appointments ?? 0}
												</td>
												<td className="ops-num" data-label="Занятость">
													{formatPercent(row?.utilization ?? null)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<p className="ops-hint">
								{summary.chairs?.basis?.note ?? ""}
							</p>
						</>
					)}
				</>
			) : null}
		</>
	);
}
