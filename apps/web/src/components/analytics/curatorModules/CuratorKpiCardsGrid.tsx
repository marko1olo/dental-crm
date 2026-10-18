import React from "react";
import type { CuratorConversionMetrics } from "@dental/shared";
import { Coins, DollarSign, TrendingUp, Users } from "lucide-react";

export interface CuratorKpiCardsGridProps {
	readonly metrics: CuratorConversionMetrics;
}

export const CuratorKpiCardsGrid: React.FC<CuratorKpiCardsGridProps> = ({ metrics }) => {
	const avgPlanPrice = metrics.totalPlansCount > 0 ? Math.round(metrics.totalPlansSumRub / metrics.totalPlansCount) : 0;
	const remainingRub = Math.max(0, metrics.totalPlansSumRub - metrics.totalCollectedRevenueRub);

	return (
		<div className="curator-kpi-grid">
			<div className="curator-kpi-card">
				<div className="curator-kpi-header">
					<span className="curator-kpi-label">Планы в работе</span>
					<span className="curator-kpi-badge curator-badge-blue">
						<Users className="w-3 h-3" /> Пациенты
					</span>
				</div>
				<div className="curator-kpi-value">{metrics.totalPlansCount}</div>
				<div className="curator-kpi-subtext">
					Из них завершено: <strong>{metrics.completedPlansCount}</strong>
				</div>
			</div>

			<div className="curator-kpi-card">
				<div className="curator-kpi-header">
					<span className="curator-kpi-label">Общая сумма смет</span>
					<span className="curator-kpi-badge curator-badge-purple">
						<DollarSign className="w-3 h-3" /> Портфель
					</span>
				</div>
				<div className="curator-kpi-value">{metrics.totalPlansSumRub.toLocaleString("ru-RU")} ₽</div>
				<div className="curator-kpi-subtext">Средний чек: {avgPlanPrice.toLocaleString("ru-RU")} ₽</div>
			</div>

			<div className="curator-kpi-card">
				<div className="curator-kpi-header">
					<span className="curator-kpi-label">Фактически внесено</span>
					<span className="curator-kpi-badge curator-badge-emerald">
						<TrendingUp className="w-3 h-3" /> Касса и чеки
					</span>
				</div>
				<div className="curator-kpi-value" style={{ color: "var(--teal, #0d9488)" }}>
					{metrics.totalCollectedRevenueRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="curator-kpi-subtext">
					Остаток к оплате: {remainingRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="curator-kpi-card">
				<div className="curator-kpi-header">
					<span className="curator-kpi-label">Комиссия куратора</span>
					<span className="curator-kpi-badge curator-badge-amber">
						<Coins className="w-3 h-3" /> Сдельно {metrics.effectiveCommissionRatePercent}%
					</span>
				</div>
				<div className="curator-kpi-value" style={{ color: "var(--accent, #6366f1)" }}>
					{metrics.commissionEarnedRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="curator-kpi-subtext">Начислено по закрытым этапам</div>
			</div>
		</div>
	);
};
