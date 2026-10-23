/**
 * MarketingRoiAdCard.tsx
 *
 * Секция 3 дашборда: Окупаемость рекламы (ROMI, CAC, CPL, лидер по ROMI).
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React from "react";
import { Flame, TrendingUp } from "lucide-react";
import type { MarketingMetricsSummary, ChannelFunnelMetric } from "./marketingDashboardTypes";

interface MarketingRoiAdCardProps {
	summary: MarketingMetricsSummary;
	topChannel: ChannelFunnelMetric | null | undefined;
}

export function MarketingRoiAdCard({ summary, topChannel }: MarketingRoiAdCardProps) {
	return (
		<div className="marketing-section-card" data-testid="marketing-roi-section">
			<div className="marketing-section-card-header">
				<h2 className="marketing-section-title">
					<TrendingUp size={16} className="text-[var(--teal)]" />
					<span>Окупаемость рекламы (ROMI)</span>
				</h2>
				<span className="marketing-section-badge">Unit-экономика</span>
			</div>

			<div className="marketing-romi-hero">
				<div className="marketing-romi-main">
					<span className="marketing-romi-val">
						{summary.romiPercent > 0 ? `+${summary.romiPercent}%` : `${summary.romiPercent}%`}
					</span>
					<span className="marketing-romi-label">
						Итоговая рентабельность инвестиций в маркетинг
					</span>
				</div>
				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
						{(summary.totalRevenueRub || 0).toLocaleString("ru-RU")} ₽
					</div>
					<div style={{ fontSize: 11, color: "var(--muted)" }}>
						Привлеченная выручка
					</div>
				</div>
			</div>

			<div className="marketing-romi-details">
				<div className="marketing-romi-detail-box">
					<span className="marketing-romi-detail-val">
						{summary.cacRub > 0 ? `${summary.cacRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
					</span>
					<span className="marketing-romi-detail-lbl">
						CAC (Стоимость привлечения пациента)
					</span>
				</div>

				<div className="marketing-romi-detail-box">
					<span className="marketing-romi-detail-val">
						{summary.cplRub > 0 ? `${summary.cplRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
					</span>
					<span className="marketing-romi-detail-lbl">
						CPL (Стоимость входящей заявки)
					</span>
				</div>
			</div>

			{topChannel && (
				<div className="marketing-best-channel-box">
					<Flame size={15} className="shrink-0" />
					<span className="truncate">
						Лидер по окупаемости: <strong>{topChannel.channelLabel}</strong> ({topChannel.romiPercent}% ROMI)
					</span>
				</div>
			)}
		</div>
	);
}
