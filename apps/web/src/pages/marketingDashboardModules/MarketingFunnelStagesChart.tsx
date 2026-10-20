/**
 * MarketingFunnelStagesChart.tsx
 *
 * Layer 4: Секция 2 левой колонки дашборда:
 * Конверсионная воронка (CR) первичных пациентов по этапам
 * и соотношение самозаписи (онлайн/виджет) и ресепшена (телефон/АТС).
 */

import React from "react";
import { BarChart3, Globe, Users } from "lucide-react";
import type { MarketingFunnelStagesChartProps } from "./marketingDashboardTypes";

export function MarketingFunnelStagesChart({
	stages,
	intakeSplit,
	onOpenDetailedAudit,
}: MarketingFunnelStagesChartProps) {
	return (
		<div className="marketing-section-card" data-testid="marketing-funnel-section">
			<div className="marketing-section-card-header">
				<h2 className="marketing-section-title">
					<BarChart3 size={16} className="text-[var(--teal)]" />
					<span>Конверсионная воронка (CR)</span>
				</h2>
				<button
					type="button"
					className="marketing-modal-link"
					onClick={onOpenDetailedAudit}
					data-testid="open-funnel-modal-link"
				>
					Подробный аудит →
				</button>
			</div>

			<div className="marketing-funnel-steps">
				{stages.slice(0, 4).map((st, idx) => (
					<div key={st.key} className="marketing-funnel-step">
						<div className="marketing-funnel-step-left">
							<span className="marketing-funnel-num">{idx + 1}</span>
							<span className="marketing-funnel-step-name">{st.label}</span>
						</div>
						<div className="marketing-funnel-step-right">
							<span className="marketing-funnel-count">{st.count}</span>
							<span className="marketing-funnel-cr">
								{st.conversionFromFirstPercent}% от всех
							</span>
						</div>
					</div>
				))}
			</div>

			{/* Intake Split: Self-booking vs Telephony */}
			<div className="marketing-intake-split" data-testid="marketing-intake-split">
				<div className="marketing-intake-col">
					<Globe size={15} className="text-[var(--teal)]" />
					<span>Самозапись (виджет/карты): <strong>{intakeSplit.onlinePercent}%</strong></span>
				</div>
				<div className="marketing-intake-col">
					<Users size={15} className="text-[var(--muted)]" />
					<span>Ресепшен (АТС/звонки): <strong>{intakeSplit.adminPercent}%</strong></span>
				</div>
			</div>
		</div>
	);
}
