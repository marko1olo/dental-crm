import React from "react";
import { Activity, ArrowUpRight, CheckCircle2, Coins, CreditCard, Sparkles, UserCheck, Wallet } from "lucide-react";
import type { ExecutivePeriodComputedMetrics } from "./executiveAnalyticsTypes";

export interface MobileExecutiveKpiCardsProps {
	readonly periodMetrics: ExecutivePeriodComputedMetrics;
	readonly totalChairsCount: number;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export function MobileExecutiveKpiCards({
	periodMetrics,
	totalChairsCount,
	onNavigateToSection,
}: MobileExecutiveKpiCardsProps) {
	const ringOffset = 69.1 - (69.1 * Math.min(100, Math.max(0, periodMetrics.occupancyPercent))) / 100;

	return (
		<section className="mobile-exec-kpi-grid" aria-label="3 ключевые цифры соло-врача и клиники (Мандат 8n)">
			<div className="mobile-exec-kpi-card" data-testid="kpi-card-revenue">
				<div className="kpi-card-top">
					<span className="kpi-card-label">Выручка за период</span>
					<div className="kpi-card-icon-wrap icon-teal"><Coins size={16} aria-hidden="true" /></div>
				</div>
				<div className="kpi-card-value font-mono text-[28px] sm:text-[32px] font-bold">
					{periodMetrics.revenueFormatted}
				</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success"><ArrowUpRight size={12} aria-hidden="true" />{periodMetrics.revenueDelta}</span>
					<span className="kpi-card-sub">План: {periodMetrics.revenuePlanFormatted}</span>
				</div>
			</div>

			<div
				className="mobile-exec-kpi-card"
				data-testid="kpi-card-net-profit"
				onClick={onNavigateToSection ? () => onNavigateToSection("financial_analytics") : undefined}
			>
				<div className="kpi-card-top">
					<span className="kpi-card-label">Доход к выплате (ФОТ)</span>
					<div className="kpi-card-icon-wrap icon-teal"><Wallet size={16} aria-hidden="true" /></div>
				</div>
				<div className="kpi-card-value font-mono text-[28px] sm:text-[32px] font-bold text-[var(--ok-fg,#10b981)]">
					{periodMetrics.doctorNetIncomeFormatted || periodMetrics.netProfit}
				</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-neutral"><Sparkles size={11} aria-hidden="true" />P&amp;L отчет</span>
					<span className="kpi-card-sub">Прибыль: {periodMetrics.netProfit}</span>
				</div>
			</div>

			<div
				className="mobile-exec-kpi-card"
				onClick={onNavigateToSection ? () => onNavigateToSection("freed_slots") : undefined}
				data-testid="kpi-card-occupancy"
			>
				<div className="kpi-card-top">
					<span className="kpi-card-label">Загрузка кресел</span>
					<div className="kpi-card-icon-wrap icon-teal"><Activity size={16} aria-hidden="true" /></div>
				</div>
				<div className="kpi-card-row-value">
					<div className="kpi-card-value font-mono text-[28px] sm:text-[32px] font-bold">
						{periodMetrics.occupancyPercent}%
					</div>
					<div className="kpi-mini-ring" aria-hidden="true">
						<svg width="28" height="28" viewBox="0 0 28 28">
							<circle cx="14" cy="14" r="11" fill="none" stroke="var(--line, #cbd5e1)" strokeWidth="3" />
							<circle cx="14" cy="14" r="11" fill="none" stroke="var(--teal, #0d9488)" strokeWidth="3" strokeLinecap="round" strokeDasharray={69.1} strokeDashoffset={ringOffset} style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
						</svg>
					</div>
				</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-neutral"><CheckCircle2 size={11} aria-hidden="true" />Оптимально</span>
					<span className="kpi-card-sub">{totalChairsCount} кресел • {periodMetrics.chairHourlyCostFormatted}</span>
				</div>
			</div>

			<div className="mobile-exec-kpi-card" data-testid="kpi-card-average-check">
				<div className="kpi-card-top">
					<span className="kpi-card-label">Средний чек</span>
					<div className="kpi-card-icon-wrap icon-teal"><CreditCard size={16} aria-hidden="true" /></div>
				</div>
				<div className="kpi-card-value font-mono text-[22px] font-bold">{periodMetrics.averageCheck}</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success">{periodMetrics.averageCheckDelta}</span>
					<span className="kpi-card-sub">LTV: {periodMetrics.ltv}</span>
				</div>
			</div>

			<div
				className="mobile-exec-kpi-card"
				onClick={onNavigateToSection ? () => onNavigateToSection("curators") : undefined}
				data-testid="kpi-card-primary-patients"
			>
				<div className="kpi-card-top">
					<span className="kpi-card-label">Первичные</span>
					<div className="kpi-card-icon-wrap icon-teal"><UserCheck size={16} aria-hidden="true" /></div>
				</div>
				<div className="kpi-card-value font-mono text-[22px] font-bold">{periodMetrics.primaryPatients} пац.</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success">{periodMetrics.primaryDelta}</span>
					<span className="kpi-card-sub">Повторные: {periodMetrics.repeatPatients}</span>
				</div>
			</div>
		</section>
	);
}
