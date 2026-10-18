import React from "react";
import type { ExecutiveKpisSummary } from "@dental/shared";
import { Coins } from "lucide-react";
import { formatRublesClean } from "./executiveAnalyticsTypes";

interface DesktopRevenueCardProps {
	readonly kpis: ExecutiveKpisSummary;
}

export function DesktopRevenueCard({ kpis }: DesktopRevenueCardProps) {
	return (
		<div
			className="executive-kpi-card"
			style={{ "--card-accent": "var(--teal, #0d9488)" } as React.CSSProperties}
			data-testid="kpi-card-revenue"
		>
			<div>
				<div className="executive-kpi-header">
					<span className="executive-kpi-label" title="Сколько заработано за период (Касса + безнал + СБП)">
						1. Выручка за период
					</span>
					<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
						<Coins size={18} aria-hidden="true" />
					</div>
				</div>
				<div className="executive-kpi-main-val font-mono text-[28px] font-bold text-[var(--ink,#0f172a)]">
					{formatRublesClean(kpis.totalRevenueRub ?? kpis.totalRevenueFormatted)}
				</div>
			</div>
			<div className="executive-kpi-subtext">
				<span>План: {formatRublesClean(kpis.totalRevenuePlanFormatted)}</span>
				<span
					className={`executive-pill ${
						(kpis.overallPlanFulfillmentPercent ?? 0) >= 95
							? "executive-pill-success"
							: (kpis.overallPlanFulfillmentPercent ?? 0) >= 75
								? "executive-pill-warning"
								: "executive-pill-danger"
					}`}
				>
					{kpis.overallPlanFulfillmentPercent ?? 0}% плана
				</span>
			</div>
			{kpis.paymentBreakdown && (
				<div className="mt-2 pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
					<span>Касса: {kpis.paymentBreakdown.cashPercent}%</span>
					<span>Безнал: {kpis.paymentBreakdown.cardDmsPercent}%</span>
					<span>СБП: {kpis.paymentBreakdown.sbpPercent}%</span>
				</div>
			)}
		</div>
	);
}
