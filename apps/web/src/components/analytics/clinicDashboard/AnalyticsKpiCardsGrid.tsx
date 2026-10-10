/**
 * apps/web/src/components/analytics/clinicDashboard/AnalyticsKpiCardsGrid.tsx
 *
 * Сетка 4 доминантных финансовых и операционных KPI клиники (Tier 1).
 * Выручка факт, средний чек, дебиторка, утилизация кресел.
 */

import React from "react";
import {
	Activity,
	Clock,
	Coins,
	CreditCard,
	Wallet,
} from "lucide-react";
import {
	type FinancialAnalyticsSummary,
	formatMoneyKopecks,
} from "../financialAnalyticsEngine.js";
import type { ClinicChairUtilizationSummary } from "../chairUtilizationEngine.js";

export interface AnalyticsKpiCardsGridProps {
	readonly financialSummary: FinancialAnalyticsSummary;
	readonly chairSummary: ClinicChairUtilizationSummary;
	readonly periodLabel: string;
}

export const AnalyticsKpiCardsGrid: React.FC<AnalyticsKpiCardsGridProps> = ({
	financialSummary,
	chairSummary,
	periodLabel,
}) => {
	return (
		<>
			{/* ─── 4 ДОМИНАНТНЫХ ФИНАНСОВЫХ И ОПЕРАЦИОННЫХ KPI (TIER 1) ─────────────── */}
			<section className="cad-kpi-grid" aria-label="Ключевые показатели клиники">
				{/* 1. Фактическая выручка */}
				<div className="cad-kpi-card" style={{ "--kpi-accent": "var(--teal, #0d9488)" } as React.CSSProperties}>
					<div className="cad-kpi-header">
						<span className="cad-kpi-label">Выручка клиники (Факт)</span>
						<Coins size={16} className="cad-kpi-icon" />
					</div>
					<div className="cad-kpi-value">
						{formatMoneyKopecks(financialSummary.netRevenueKopecks, false)}
					</div>
					<div className="cad-kpi-subtext">
						<span>Первичка: {financialSummary.patientSegmentation.primarySharePercent}%</span>
						<span>•</span>
						<span>{periodLabel}</span>
					</div>
				</div>

				{/* 2. Реальный средний чек */}
				<div className="cad-kpi-card" style={{ "--kpi-accent": "var(--accent, #6366f1)" } as React.CSSProperties}>
					<div className="cad-kpi-header">
						<span className="cad-kpi-label">Средний чек визита</span>
						<Wallet size={16} className="cad-kpi-icon" />
					</div>
					<div className="cad-kpi-value">
						{formatMoneyKopecks(financialSummary.averageCheckKopecks, false)}
					</div>
					<div className="cad-kpi-subtext">
						<span>Завершено визитов: {financialSummary.completedVisitsCount}</span>
					</div>
				</div>

				{/* 3. Дебиторская задолженность (Долги пациентов) */}
				<div className="cad-kpi-card" style={{ "--kpi-accent": "var(--warn-fg, #f59e0b)" } as React.CSSProperties}>
					<div className="cad-kpi-header">
						<span className="cad-kpi-label">Дебиторка клиники</span>
						<CreditCard size={16} className="cad-kpi-icon" />
					</div>
					<div
						className="cad-kpi-value"
						style={{
							color:
								financialSummary.accountsReceivable.totalDebtKopecks > 0
									? "var(--warn-fg, #f59e0b)"
									: "inherit",
						}}
					>
						{formatMoneyKopecks(financialSummary.accountsReceivable.totalDebtKopecks, false)}
					</div>
					<div className="cad-kpi-subtext">
						<span>Неоплаченных счетов: {financialSummary.accountsReceivable.openInvoicesCount}</span>
						{financialSummary.accountsReceivable.overdueDebtKopecks > 0 && (
							<span style={{ color: "var(--err-fg, #ef4444)" }}>
								(Просрочено: {formatMoneyKopecks(financialSummary.accountsReceivable.overdueDebtKopecks, false)})
							</span>
						)}
					</div>
				</div>

				{/* 4. Загрузка кресел клиники */}
				<div className="cad-kpi-card" style={{ "--kpi-accent": "var(--ok-fg, #10b981)" } as React.CSSProperties}>
					<div className="cad-kpi-header">
						<span className="cad-kpi-label">Загрузка кресел</span>
						<Activity size={16} className="cad-kpi-icon" />
					</div>
					<div className="cad-kpi-value">
						{chairSummary.overallUtilizationPercent}%
					</div>
					<div className="cad-kpi-subtext">
						<span>Чистая: {chairSummary.overallPureOccupancyPercent}%</span>
						<span>•</span>
						<span>Кресел: {chairSummary.totalChairsCount} шт.</span>
					</div>
				</div>
			</section>

			{/* Памятка по буферу подготовки кабинета */}
			<div className="cad-sanpin-note" role="note">
				<Clock size={14} style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }} />
				<span>
					В полезную загрузку включен буфер 15 мин на подготовку и проветривание кабинета между пациентами.
				</span>
			</div>
		</>
	);
};
