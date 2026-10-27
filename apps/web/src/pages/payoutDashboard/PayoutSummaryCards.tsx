/**
 * apps/web/src/pages/payoutDashboard/PayoutSummaryCards.tsx
 * Summary cards and clinic totals for Doctor Payout Dashboard.
 * Mandates 8b, 8e, 8n. File <= 120 lines.
 */

import React from "react";
import { money } from "../../AppHelpers";
import { PayoutLimitationsNotes } from "./PayoutLimitationsNotes";
import type { PayoutSummaryCardsProps } from "./types";

export function PayoutSummaryCards({
	report,
	isOwnScope,
	ownVisible,
	canEditRates,
}: PayoutSummaryCardsProps) {
	const nothingComputed = report.totals.doctorsCounted === 0;

	return (
		<>
			<ul className="ops-metrics">
				<li
					className={`ops-metric ops-metric--primary ${
						nothingComputed || report.totals.payoutRub < 0 ? "ops-metric--danger" : ""
					}`}
				>
					<span className="ops-metric__value">
						{nothingComputed ? "—" : money(report.totals.payoutRub)}
					</span>
					<span className="ops-metric__label">
						{nothingComputed
							? isOwnScope
								? "к выплате: не посчитано"
								: "к выплате: не посчитано ни по одному врачу"
							: isOwnScope
								? "к выплате мне"
								: "к выплате всего"}
					</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{nothingComputed ? "—" : money(report.totals.accruedRub)}
					</span>
					<span className="ops-metric__label">начислено процентом</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{nothingComputed ? "—" : money(report.totals.withheldMaterialRub)}
					</span>
					<span className="ops-metric__label">удержано за материалы</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{nothingComputed ? "—" : money(report.totals.withheldLabRub ?? 0)}
					</span>
					<span className="ops-metric__label">удержано за ЗТЛ (Лаборатория)</span>
				</li>
				<li className="ops-metric">
					<span className="ops-metric__value">
						{money(isOwnScope ? ownVisible.revenueRub : report.totals.revenueRub)}
					</span>
					<span className="ops-metric__label">
						{isOwnScope ? "моя касса за месяц" : "касса клиники за месяц"}
					</span>
				</li>
			</ul>

			<PayoutLimitationsNotes
				report={report}
				isOwnScope={isOwnScope}
				canEditRates={canEditRates}
			/>
		</>
	);
}
