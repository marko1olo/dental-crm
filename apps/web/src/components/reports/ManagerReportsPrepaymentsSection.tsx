/**
 * Разрезы дебиторки по корзинам давности и переплат пациентов в отчётах управляющего.
 */

import React from "react";
import { money } from "../../AppHelpers";
import { formatRub as shortRub } from "../../pages/analyticsDoctorMetrics.js";
import { bucketLabels } from "./managerReportsHelpers";
import type { ReportsSummary } from "./ManagerReportsTypes";
import { safePercentWidth } from "./reportsCsvExport";

export interface ManagerReportsPrepaymentsSectionProps {
	readonly summary: ReportsSummary;
}

export function ManagerReportsPrepaymentsSection({
	summary,
}: ManagerReportsPrepaymentsSectionProps) {
	return (
		<>
			{/* ── Дебиторка ─────────────────────────────────────────── */}
			<h3 className="ops-section-title">Дебиторка</h3>
			{(summary.receivables?.totalDebtRub ?? 0) === 0 ? (
				<p className="ops-empty ops-empty--good">Долгов нет.</p>
			) : (
				<ul className="ops-bars">
					{Object.entries(summary.receivables?.byBucket ?? {})
						.filter(([, amount]) => amount > 0)
						.map(([bucket, amount]) => (
							<li className="ops-bar" key={bucket}>
								<span className="ops-bar__label">
									{bucketLabels[bucket] ?? bucket}
								</span>
								<span className="ops-bar__track">
									<span
										className="ops-bar__fill"
										style={{
											width: `${safePercentWidth(amount, summary.receivables?.totalDebtRub, 2)}%`,
										}}
									/>
								</span>
								<span className="ops-bar__value" title={money(amount)}>
									{shortRub(amount)}
								</span>
							</li>
						))}
				</ul>
			)}

			{/* ── Переплаты: клиника должна вернуть ────────────────────── */}
			{(summary.receivables?.totalPrepaidRub ?? 0) > 0 && (
				<>
					<h3 className="ops-section-title">
						Переплаты: клиника должна вернуть
					</h3>
					<div className="ops-table-wrap">
						<table className="ops-table">
							<thead>
								<tr>
									<th scope="col">Пациент</th>
									<th scope="col">Переплата</th>
								</tr>
							</thead>
							<tbody>
								{(summary.receivables?.prepayments ?? []).map((row, idx) => (
									<tr key={row?.patientId ?? `prepay-row-${idx}`}>
										<td className="ops-strong" data-label="Пациент">
											{row?.patientName ?? "—"}
										</td>
										<td className="ops-num" data-label="Переплата">
											{money(row?.prepaidRub ?? 0)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<p className="ops-hint">
						Эти пациенты заплатили больше назначенного — всего{" "}
						{money(summary.receivables?.totalPrepaidRub ?? 0)}. На главном экране
						сумма к оплате считается по всей клинике одним вычитанием, поэтому
						переплата там уже зачтена в долг других пациентов: долг{" "}
						{money(summary.receivables?.totalDebtRub ?? 0)} минус переплаты{" "}
						{money(summary.receivables?.totalPrepaidRub ?? 0)} и есть та сумма,
						которую показывает главный экран. Верните деньги или зачтите их в счёт
						следующего приёма — иначе долг клиники продолжит выглядеть меньше, чем
						он есть.
					</p>
				</>
			)}
		</>
	);
}
