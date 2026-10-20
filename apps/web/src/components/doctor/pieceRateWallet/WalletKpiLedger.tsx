/**
 * WalletKpiLedger.tsx — 4-карточная сводка KPI сдельной оплаты и прозрачная формула.
 *
 * Mandate 8e & DENTE HIG:
 * - Выработка по прайсу
 * - Вычет ЗТЛ лаборатории
 * - Чистая база сделки
 * - Начислено к выплате (с акцентным токеном var(--teal))
 */

import React from "react";
import { Banknote, Layers, Percent, Sparkles, HelpCircle } from "lucide-react";
import { pluralizeRu, type EarningsDataState } from "./types.js";

export interface WalletKpiLedgerProps {
	readonly data: EarningsDataState;
	readonly isReconciledConfirmed: boolean;
}

export const WalletKpiLedger: React.FC<WalletKpiLedgerProps> = ({
	data,
	isReconciledConfirmed,
}) => {
	const { summary, formulaExplanationRu } = data;

	return (
		<>
			{/* KPI Summary Grid (4-Card Ledger: Monochrome Base + Single Teal Brand Accent) */}
			<div className="dpr-kpi-grid">
				{/* Gross Revenue */}
				<div className="dpr-kpi-card" data-testid="kpi-gross-card">
					<div className="dpr-kpi-label">
						<span>Выработка по прайсу</span>
						<Banknote size={14} className="dpr-kpi-icon-muted" />
					</div>
					<div className="dpr-kpi-value" data-testid="kpi-gross-value">
						{summary.totalGrossRevenueRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="dpr-kpi-hint">
						{summary.completedAppointmentsCount}{" "}
						{pluralizeRu(summary.completedAppointmentsCount, [
							"приём",
							"приёма",
							"приёмов",
						])}{" "}
						• {summary.totalServicesCount}{" "}
						{pluralizeRu(summary.totalServicesCount, [
							"услуга",
							"услуги",
							"услуг",
						])}
					</div>
				</div>

				{/* Dental Lab ZTL Deductions */}
				<div className="dpr-kpi-card" data-testid="kpi-lab-card">
					<div className="dpr-kpi-label">
						<span>Вычет ЗТЛ лаборатории</span>
						<Layers size={14} className="dpr-kpi-icon-muted" />
					</div>
					<div className="dpr-kpi-value" data-testid="kpi-lab-value">
						−{summary.totalLabDeductionsRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="dpr-kpi-hint">
						Прямые наряды на коронки и мосты
					</div>
				</div>

				{/* Net Calculation Base */}
				<div className="dpr-kpi-card" data-testid="kpi-netbase-card">
					<div className="dpr-kpi-label">
						<span>Чистая база сделки</span>
						<Percent size={14} className="dpr-kpi-icon-muted" />
					</div>
					<div className="dpr-kpi-value" data-testid="kpi-netbase-value">
						{summary.netBaseRevenueRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="dpr-kpi-hint">
						Средняя ставка: {summary.averageCommissionPercent}%
					</div>
				</div>

				{/* Doctor Net Earned (Payout) — Single Brand Accent */}
				<div
					className="dpr-kpi-card highlight"
					data-testid="kpi-earned-card"
				>
					<div className="dpr-kpi-label">
						<span>Начислено к выплате</span>
						<Sparkles size={14} className="dpr-kpi-icon-accent" />
					</div>
					<div className="dpr-kpi-value" data-testid="kpi-earned-value">
						{summary.totalDoctorEarnedRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="dpr-kpi-hint flex items-center gap-1.5">
						<span className="dpr-status-dot-teal" />
						<span>
							{isReconciledConfirmed
								? "Сверено с кассой"
								: summary.paymentReconciliationStatus === "fully_reconciled"
									? "Все визиты оплачены"
									: "Ожидает закрытия смены"}
						</span>
					</div>
				</div>
			</div>

			{/* Transparent Net Formula Strip */}
			<div className="dpr-formula-strip" data-testid="dpr-formula-strip">
				<HelpCircle size={16} />
				<span>{formulaExplanationRu}</span>
			</div>
		</>
	);
};
