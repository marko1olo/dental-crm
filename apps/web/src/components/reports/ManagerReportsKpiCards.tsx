import React from "react";
import { money } from "../../AppHelpers";
import { formatRub as shortRub } from "../../pages/analyticsDoctorMetrics.js";
import { formatPercent } from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsKpiCardsProps {
	readonly summary: ReportsSummary;
}

export function ManagerReportsKpiCards({ summary }: ManagerReportsKpiCardsProps) {
	const completedApts = Math.max(
		0,
		(summary.appointments?.total ?? 0) - (summary.appointments?.lostAppointments ?? 0),
	);
	const averageTicketRub = completedApts > 0 ? Math.round((summary.revenue?.totalRub ?? 0) / completedApts) : 0;

	return (
		<>
			<h3 className="ops-section-title">Итоги периода</h3>
			<ul className="ops-metrics">
				<li className="ops-metric ops-metric--primary">
					<span className="ops-metric__value" title={money(summary.revenue?.totalRub ?? 0)}>
						{shortRub(summary.revenue?.totalRub ?? 0)}
					</span>
					<span className="ops-metric__label">получено</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value" title={money(averageTicketRub)}>
						{shortRub(averageTicketRub)}
					</span>
					<span className="ops-metric__label">средний чек</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">{summary.appointments?.total ?? 0}</span>
					<span className="ops-metric__label">приёмов</span>
				</li>
				<li className={`ops-metric ${(summary.appointments?.lostAppointments ?? 0) > 0 ? "ops-metric--danger" : ""}`}>
					<span className="ops-metric__value">{summary.appointments?.lostAppointments ?? 0}</span>
					<span className="ops-metric__label">потеряно: отмены и неявки</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{formatPercent(summary.appointments?.noShowRate ?? null)}
					</span>
					<span className="ops-metric__label">доля неявок</span>
				</li>
				<li className={`ops-metric ${(summary.receivables?.totalDebtRub ?? 0) > 0 ? "ops-metric--danger" : ""}`}>
					<span className="ops-metric__value" title={money(summary.receivables?.totalDebtRub ?? 0)}>
						{shortRub(summary.receivables?.totalDebtRub ?? 0)}
					</span>
					<span className="ops-metric__label">
						долг, {summary.receivables?.debtors ?? 0} пациент(ов)
					</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{summary.patientFlow?.newTotal ?? 0} / {summary.patientFlow?.returningTotal ?? 0}
					</span>
					<span className="ops-metric__label">пациентов: первичные / повторные</span>
				</li>
			</ul>
		</>
	);
}
