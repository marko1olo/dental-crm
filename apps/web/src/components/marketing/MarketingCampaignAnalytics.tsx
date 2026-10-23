/**
 * MarketingCampaignAnalytics.tsx — Campaign Performance Analytics & Funnel Strip.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e (Quiet Telemetry, Honest Math).
 */

import React from "react";
import { TrendingUp, Users, Target, DollarSign, Sparkles } from "lucide-react";
import type { PromoStats } from "./marketingTypes";

export interface MarketingCampaignAnalyticsProps {
	readonly stats: PromoStats;
}

export const MarketingCampaignAnalytics: React.FC<MarketingCampaignAnalyticsProps> = ({
	stats,
}) => {
	const avgCheck = stats.visits > 0 ? stats.revenueRub / stats.visits : 0;

	return (
		<div className="marketing-section" data-testid="marketing-analytics-section">
			<div className="marketing-section-header">
				<div className="flex items-center gap-1.5">
					<TrendingUp size={16} className="text-[var(--primary)]" aria-hidden="true" />
					<h4 className="marketing-section-title">Аналитика эффективности и окупаемость</h4>
				</div>
				<span className="marketing-section-badge">Автоматический учет по промокоду</span>
			</div>

			<div className="marketing-kpi-grid">
				<div className="marketing-kpi-card">
					<div className="marketing-kpi-card__top">
						<Users size={16} className="text-[var(--primary)]" aria-hidden="true" />
						<span className="marketing-kpi-label">Охват рассылки</span>
					</div>
					<div className="marketing-kpi-value">{stats.reach} чел.</div>
					<div className="marketing-kpi-sub">
						Доставлено {stats.delivered} ({stats.deliveredPercent}%)
					</div>
				</div>

				<div className="marketing-kpi-card">
					<div className="marketing-kpi-card__top">
						<Target size={16} className="text-[var(--primary)]" aria-hidden="true" />
						<span className="marketing-kpi-label">Конверсия в визиты</span>
					</div>
					<div className="marketing-kpi-value text-[var(--primary)]">
						{stats.conversionPercent}%
					</div>
					<div className="marketing-kpi-sub">{stats.visits} пациентов записались</div>
				</div>

				<div className="marketing-kpi-card">
					<div className="marketing-kpi-card__top">
						<DollarSign size={16} className="text-[var(--primary)]" aria-hidden="true" />
						<span className="marketing-kpi-label">Выручка по промокоду</span>
					</div>
					<div className="marketing-kpi-value">
						{stats.revenueRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="marketing-kpi-sub">
						Ср. чек: {avgCheck.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
					</div>
				</div>

				<div className="marketing-kpi-card">
					<div className="marketing-kpi-card__top">
						<Sparkles size={16} className="text-[var(--primary)]" aria-hidden="true" />
						<span className="marketing-kpi-label">Окупаемость (ROMI)</span>
					</div>
					<div className="marketing-kpi-value text-[var(--primary)] font-extrabold">
						+{stats.romiPercent}%
					</div>
					<div className="marketing-kpi-sub">
						Затраты: {stats.budgetSpentRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
			</div>

			<div className="marketing-funnel-bar">
				<div className="marketing-funnel-step">
					<span className="marketing-funnel-num">{stats.reach}</span>
					<span className="marketing-funnel-name">Отправлено</span>
				</div>
				<div className="marketing-funnel-arrow">→</div>
				<div className="marketing-funnel-step">
					<span className="marketing-funnel-num">{stats.delivered}</span>
					<span className="marketing-funnel-name">Доставлено ({stats.deliveredPercent}%)</span>
				</div>
				<div className="marketing-funnel-arrow">→</div>
				<div className="marketing-funnel-step">
					<span className="marketing-funnel-num text-[var(--primary)]">{stats.visits}</span>
					<span className="marketing-funnel-name">Визиты ({stats.conversionPercent}%)</span>
				</div>
				<div className="marketing-funnel-arrow">→</div>
				<div className="marketing-funnel-step">
					<span className="marketing-funnel-num font-bold">
						{(stats.revenueRub / 1000).toFixed(0)}k ₽
					</span>
					<span className="marketing-funnel-name">Оплачено в кассу</span>
				</div>
			</div>
		</div>
	);
};
