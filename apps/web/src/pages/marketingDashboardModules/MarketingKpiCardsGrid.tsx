/**
 * MarketingKpiCardsGrid.tsx
 *
 * Layer 4: Сетка из 4 сбалансированных KPI-карточек маркетинга:
 * 1. Рекламный бюджет + CPL
 * 2. Обращения / Лиды + % квалификации
 * 3. Первичные визиты + CR
 * 4. Окупаемость ROMI + Выручка
 */

import React from "react";
import { CheckCircle2, Sliders, TrendingUp, Users } from "lucide-react";
import type { MarketingKpiCardsGridProps } from "./marketingDashboardTypes";

export function MarketingKpiCardsGrid({ summary }: MarketingKpiCardsGridProps) {
	const contactedPercent =
		summary.totalLeads > 0
			? Math.round((summary.contactedLeads / summary.totalLeads) * 100)
			: 0;

	return (
		<div className="marketing-dashboard-kpis">
			{/* KPI 1: Ad Spend */}
			<div className="marketing-kpi-card" data-testid="kpi-ad-spend">
				<div className="marketing-kpi-top">
					<span className="marketing-kpi-label">Рекламный бюджет</span>
					<Sliders size={16} className="marketing-kpi-icon" />
				</div>
				<div className="marketing-kpi-value">
					{(summary.totalMarketingSpendRub || 0).toLocaleString("ru-RU")} ₽
				</div>
				<div className="marketing-kpi-sub">
					<span>CPL: </span>
					<strong>{(summary.cplRub || 0).toLocaleString("ru-RU")} ₽ / лид</strong>
				</div>
			</div>

			{/* KPI 2: Total Leads */}
			<div className="marketing-kpi-card" data-testid="kpi-total-leads">
				<div className="marketing-kpi-top">
					<span className="marketing-kpi-label">Обращения / Лиды</span>
					<Users size={16} className="marketing-kpi-icon" />
				</div>
				<div className="marketing-kpi-value">{summary.totalLeads}</div>
				<div className="marketing-kpi-sub">
					<span>Квалифицировано: </span>
					<strong>
						{summary.contactedLeads} ({contactedPercent}%)
					</strong>
				</div>
			</div>

			{/* KPI 3: Show-ups (Visits) */}
			<div className="marketing-kpi-card" data-testid="kpi-show-ups">
				<div className="marketing-kpi-top">
					<span className="marketing-kpi-label">Дошли до клиники</span>
					<CheckCircle2 size={16} className="marketing-kpi-icon" />
				</div>
				<div className="marketing-kpi-value">{summary.showUpLeads}</div>
				<div className="marketing-kpi-sub">
					<span className="marketing-kpi-tag-good">
						CR {summary.showUpRatePercent}% в первичный визит
					</span>
				</div>
			</div>

			{/* KPI 4: ROMI & Revenue */}
			<div className="marketing-kpi-card" data-testid="kpi-romi-revenue">
				<div className="marketing-kpi-top">
					<span className="marketing-kpi-label">Окупаемость ROMI</span>
					<TrendingUp size={16} className="marketing-kpi-icon" />
				</div>
				<div className="marketing-kpi-value">
					{summary.romiPercent > 0 ? `+${summary.romiPercent}%` : `${summary.romiPercent}%`}
				</div>
				<div className="marketing-kpi-sub">
					<span>Выручка: </span>
					<strong>{(summary.totalRevenueRub || 0).toLocaleString("ru-RU")} ₽</strong>
				</div>
			</div>
		</div>
	);
}
