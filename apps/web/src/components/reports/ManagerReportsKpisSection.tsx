/**
 * Главные числа и динамика выручки в отчётах управляющего.
 */

import React from "react";
import { money } from "../../AppHelpers";
import { formatRub as shortRub } from "../../pages/analyticsDoctorMetrics.js";
import { formatPercent } from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";
import { safePercentWidth } from "./reportsCsvExport";

export interface ManagerReportsKpisSectionProps {
	readonly summary: ReportsSummary;
	readonly maxRevenue: number;
}

export function ManagerReportsKpisSection({
	summary,
	maxRevenue,
}: ManagerReportsKpisSectionProps) {
	return (
		<>
			{/* ── Главные числа ─────────────────────────────────────── */}
			<h3 className="ops-section-title">Итоги периода</h3>
			<ul className="ops-metrics">
				<li className="ops-metric ops-metric--primary">
					<span
						className="ops-metric__value"
						title={money(summary.revenue?.totalRub ?? 0)}
					>
						{shortRub(summary.revenue?.totalRub ?? 0)}
					</span>
					<span className="ops-metric__label">получено</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{summary.appointments?.total ?? 0}
					</span>
					<span className="ops-metric__label">приёмов</span>
				</li>
				<li
					className={`ops-metric ${(summary.appointments?.lostAppointments ?? 0) > 0 ? "ops-metric--danger" : ""}`}
				>
					<span className="ops-metric__value">
						{summary.appointments?.lostAppointments ?? 0}
					</span>
					<span className="ops-metric__label">
						потеряно: отмены и неявки
					</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{formatPercent(summary.appointments?.noShowRate ?? null)}
					</span>
					<span className="ops-metric__label">доля неявок</span>
				</li>
				<li
					className={`ops-metric ${(summary.receivables?.totalDebtRub ?? 0) > 0 ? "ops-metric--danger" : ""}`}
				>
					<span
						className="ops-metric__value"
						title={money(summary.receivables?.totalDebtRub ?? 0)}
					>
						{shortRub(summary.receivables?.totalDebtRub ?? 0)}
					</span>
					<span className="ops-metric__label">
						долг, {summary.receivables?.debtors ?? 0} пациент(ов)
					</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{summary.patientFlow?.newTotal ?? 0} /{" "}
						{summary.patientFlow?.returningTotal ?? 0}
					</span>
					<span className="ops-metric__label">
						пациентов: первичные / повторные
					</span>
				</li>
			</ul>

			{/* ── Динамика выручки ──────────────────────────────────── */}
			<h3 className="ops-section-title">Выручка</h3>
			{summary.revenue?.isEmpty || !summary.revenue?.points ? (
				<p className="ops-empty">Платежей за период не было.</p>
			) : (
				<ul className="ops-bars">
					{(summary.revenue?.points ?? []).map((point, idx) => (
						<li className="ops-bar" key={point?.bucket ?? `rev-pt-${idx}`}>
							<span className="ops-bar__label">
								{point?.bucket ?? ""}
							</span>
							<span
								className="ops-bar__track"
								title={`${point?.paymentCount ?? 0} платеж(ей), ${point?.payingPatients ?? 0} пациент(ов)`}
							>
								<span
									className="ops-bar__fill"
									style={{
										width: `${safePercentWidth(point?.revenueRub, maxRevenue, 2)}%`,
									}}
								/>
							</span>
							<span
								className="ops-bar__value"
								title={money(point?.revenueRub ?? 0)}
							>
								{shortRub(point?.revenueRub ?? 0)}
							</span>
						</li>
					))}
				</ul>
			)}
		</>
	);
}
