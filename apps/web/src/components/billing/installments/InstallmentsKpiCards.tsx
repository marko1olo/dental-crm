/**
 * apps/web/src/components/billing/installments/InstallmentsKpiCards.tsx
 *
 * KPI summary metrics bar for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { formatKopecksRu } from "@dental/shared";
import type { InstallmentPlan } from "../installmentsEngine.js";

interface InstallmentsKpiCardsProps {
	readonly plan: InstallmentPlan;
}

export const InstallmentsKpiCards: React.FC<InstallmentsKpiCardsProps> = ({ plan }) => {
	return (
		<div className="patient-installments-grid-kpi" data-testid="installments-kpi-bar">
			<div className="patient-installments-kpi-card">
				<span className="patient-installments-kpi-label">Сумма договора</span>
				<span className="patient-installments-kpi-value text-teal-700 dark:text-teal-400">
					{formatKopecksRu(plan.totalAmountKopecks)}
				</span>
			</div>

			<div className="patient-installments-kpi-card">
				<span className="patient-installments-kpi-label">1-й взнос</span>
				<span className="patient-installments-kpi-value">
					{formatKopecksRu(plan.downPaymentKopecks)}
				</span>
			</div>

			<div className="patient-installments-kpi-card">
				<span className="patient-installments-kpi-label">Оплачено всего</span>
				<span className="patient-installments-kpi-value text-emerald-600 dark:text-emerald-400">
					{formatKopecksRu(plan.paidAmountKopecks)}
				</span>
			</div>

			<div className="patient-installments-kpi-card">
				<span className="patient-installments-kpi-label">Остаток долга</span>
				<span className="patient-installments-kpi-value text-amber-600 dark:text-amber-400">
					{formatKopecksRu(plan.remainingDebtKopecks)}
				</span>
			</div>

			<div className="patient-installments-kpi-card">
				<span className="patient-installments-kpi-label">Ежемесячный платеж</span>
				<span className="patient-installments-kpi-value">
					{formatKopecksRu(plan.monthlyPaymentKopecks)}
				</span>
			</div>
		</div>
	);
};
