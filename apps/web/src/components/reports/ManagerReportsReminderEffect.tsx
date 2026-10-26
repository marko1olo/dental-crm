import React from "react";
import { formatPercent } from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsReminderEffectProps {
	readonly summary: ReportsSummary;
}

export function ManagerReportsReminderEffect({
	summary,
}: ManagerReportsReminderEffectProps) {
	const reminder = summary.reminderEffect;
	return (
		<>
			<h3 className="ops-section-title">Работают ли напоминания</h3>
			{reminder?.isEmpty ? (
				<p className="ops-empty">Приёмов за период нет — сравнивать нечего.</p>
			) : (
				<>
					<div className="ops-table-wrap">
						<table className="ops-table">
							<caption className="sr-only">
								Потери приёмов в зависимости от того, дошло ли напоминание
							</caption>
							<thead>
								<tr>
									<th scope="col">Приёмы</th>
									<th scope="col">Всего</th>
									<th scope="col">Отмены</th>
									<th scope="col">Неявки</th>
									<th scope="col">Потеряно</th>
									<th scope="col">Доля потерь</th>
								</tr>
							</thead>
							<tbody>
								{[
									["Напоминание дошло", reminder?.reminded],
									["Напоминание не дошло", reminder?.notReminded],
								].map(([label, group]) => {
									const g = group as {
										appointments?: number;
										cancelled?: number;
										noShow?: number;
										lost?: number;
										lostRate?: number | null;
									} | undefined;
									return (
										<tr key={label as string}>
											<td className="ops-strong" data-label="Приёмы">{label as string}</td>
											<td className="ops-num" data-label="Всего">{g?.appointments ?? 0}</td>
											<td className="ops-num" data-label="Отмены">{g?.cancelled ?? 0}</td>
											<td className="ops-num" data-label="Неявки">{g?.noShow ?? 0}</td>
											<td className="ops-num" data-label="Потеряно">{g?.lost ?? 0}</td>
											<td className="ops-num ops-strong" data-label="Доля потерь">
												{formatPercent(g?.lostRate ?? null)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{reminder?.lostRateDifference !== null && reminder?.lostRateDifference !== undefined ? (
						<p className={reminder?.enoughData ? "ops-hint" : "ops-hint ops-hint--weak"}>
							{reminder?.enoughData ? (
								<>
									Без напоминания теряется на{" "}
									<strong>{Math.round((reminder.lostRateDifference ?? 0) * 100)} п. п.</strong> больше.{" "}
								</>
							) : null}
							{reminder?.caveat ?? ""}
						</p>
					) : (
						<p className="ops-hint">
							Одна из групп пуста — сравнивать не с чем. {reminder?.caveat ?? ""}
						</p>
					)}
				</>
			)}
		</>
	);
}
