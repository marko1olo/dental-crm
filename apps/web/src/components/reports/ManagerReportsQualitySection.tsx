/**
 * Разрезы качества приёмов, разбивки по статусам и эффекта напоминаний в отчётах управляющего.
 */

import React from "react";
import {
	appointmentStatusLabels,
	formatPercent,
} from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";
import { safeDivide } from "./reportsCsvExport";

export interface ManagerReportsQualitySectionProps {
	readonly summary: ReportsSummary;
}

export function ManagerReportsQualitySection({
	summary,
}: ManagerReportsQualitySectionProps) {
	return (
		<>
			{/* ── Приёмы ────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Приёмы</h3>
			<p>
				Дошли до кресла:{" "}
				{formatPercent(summary.appointments?.arrivalRate ?? null)} · завершено:{" "}
				{formatPercent(summary.appointments?.completionRate ?? null)} · отменено:{" "}
				{formatPercent(summary.appointments?.cancellationRate ?? null)} · неявки:{" "}
				{formatPercent(summary.appointments?.noShowRate ?? null)}
			</p>
			<p className="ops-hint">
				Доли считаются от всех {summary.appointments?.total ?? 0} записей периода.
				Остаток до 100 % — приёмы, которые ещё не состоялись: они назначены на
				будущее или ждут подтверждения.
			</p>

			{/* ── Разбивка по статусам ────────────────────────────────── */}
			{Object.keys(summary.appointments?.byStatus ?? {}).length > 0 ? (
				<div
					className="ops-table-wrap"
					data-testid="manager-reports-appointments-by-status"
				>
					<table className="ops-table">
						<caption className="sr-only">
							Число записей периода по статусу
						</caption>
						<thead>
							<tr>
								<th scope="col">Статус</th>
								<th scope="col">Записей</th>
								<th scope="col">Доля</th>
							</tr>
						</thead>
						<tbody>
							{Object.entries(summary.appointments?.byStatus ?? {})
								.filter(([, count]) => count > 0)
								.sort((a, b) => b[1] - a[1])
								.map(([status, count]) => {
									const share = safeDivide(
										count,
										summary.appointments?.total,
										null,
									);
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
			) : null}

			{/* ── Работают ли напоминания ────────────────────────────── */}
			<h3 className="ops-section-title">Работают ли напоминания</h3>
			{summary.reminderEffect?.isEmpty ? (
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
								{(
									[
										[
											"Напоминание дошло",
											summary.reminderEffect?.reminded,
										],
										[
											"Напоминание не дошло",
											summary.reminderEffect?.notReminded,
										],
									] as const
								).map(([label, group]) => (
									<tr key={label}>
										<td className="ops-strong" data-label="Приёмы">
											{label}
										</td>
										<td className="ops-num" data-label="Всего">
											{group?.appointments ?? 0}
										</td>
										<td className="ops-num" data-label="Отмены">
											{group?.cancelled ?? 0}
										</td>
										<td className="ops-num" data-label="Неявки">
											{group?.noShow ?? 0}
										</td>
										<td className="ops-num" data-label="Потеряно">
											{group?.lost ?? 0}
										</td>
										<td
											className="ops-num ops-strong"
											data-label="Доля потерь"
										>
											{formatPercent(group?.lostRate ?? null)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{summary.reminderEffect?.lostRateDifference !== null &&
					summary.reminderEffect?.lostRateDifference !== undefined ? (
						<p
							className={
								summary.reminderEffect?.enoughData
									? "ops-hint"
									: "ops-hint ops-hint--weak"
							}
						>
							{summary.reminderEffect?.enoughData ? (
								<>
									Без напоминания теряется на{" "}
									<strong>
										{Math.round(
											(summary.reminderEffect?.lostRateDifference ?? 0) * 100,
										)}{" "}
										п. п.
									</strong>{" "}
									больше.{" "}
								</>
							) : null}
							{summary.reminderEffect?.caveat ?? ""}
						</p>
					) : (
						<p className="ops-hint">
							Одна из групп пуста — сравнивать не с чем.{" "}
							{summary.reminderEffect?.caveat ?? ""}
						</p>
					)}
				</>
			)}
		</>
	);
}
