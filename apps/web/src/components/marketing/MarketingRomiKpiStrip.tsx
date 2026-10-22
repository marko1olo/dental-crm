/**
 * DENTE Dental CRM — Marketing ROMI Top KPI Summary Strip.
 */

import React from "react";
import type { MarketingRomiSummary } from "@dental/shared";

export interface MarketingRomiKpiStripProps {
	readonly summary: MarketingRomiSummary;
}

function formatLeads(count: number): string {
	const abs = Math.abs(count) % 100;
	const rem = abs % 10;
	if (abs > 10 && abs < 20) return `${count} лидов`;
	if (rem > 1 && rem < 5) return `${count} лида`;
	if (rem === 1) return `${count} лид`;
	return `${count} лидов`;
}

export function MarketingRomiKpiStrip({ summary }: MarketingRomiKpiStripProps) {
	return (
		<div className="romi-kpi-grid">
			<div className="romi-kpi-item">
				<span className="romi-kpi-label">Потрачено на рекламу</span>
				<strong className="romi-kpi-value text-[var(--ink)]">
					{summary.totalSpentFormatted}
				</strong>
				<span className="romi-kpi-hint">Затраты за расчетный период</span>
			</div>

			<div className="romi-kpi-item">
				<span className="romi-kpi-label">Лиды и доходимость</span>
				<strong className="romi-kpi-value text-[var(--teal-dark)]">
					{formatLeads(summary.totalLeadsCount)}
				</strong>
				<span className="romi-kpi-hint">
					Доходимость: {summary.overallShowUpRatePercent}% ({summary.totalPrimaryPatientsCount} приемов)
				</span>
			</div>

			<div className="romi-kpi-item">
				<span className="romi-kpi-label">Выручка от первичных</span>
				<strong className="romi-kpi-value text-[var(--ink)]">
					{summary.totalRevenueFormatted}
				</strong>
				<span className="romi-kpi-hint">
					Ср. чек: {summary.overallAverageCheckFormatted}
				</span>
			</div>

			<div className="romi-kpi-item">
				<span className="romi-kpi-label">LTV и повторные визиты</span>
				<strong className="romi-kpi-value text-[var(--teal-dark)]">
					{summary.overallLtvFormatted}
				</strong>
				<span className="romi-kpi-hint">
					Повторных: {summary.totalRepeatVisitsCount} ({summary.overallRepeatRatePercent}%)
				</span>
			</div>

			<div className="romi-kpi-item highlight">
				<span className="romi-kpi-label">Общий ROMI клиники</span>
				<strong
					className={`romi-kpi-value ${
						summary.overallRomiPercent === null
							? "text-[var(--muted)]"
							: summary.overallRomiPercent >= 0
								? "text-[var(--teal-dark)]"
								: "text-[var(--bad-fg)]"
					}`}
				>
					{summary.overallRomiFormatted}
				</strong>
				<span className="romi-kpi-hint">
					Чистая прибыль: {summary.totalProfitFormatted}
				</span>
			</div>
		</div>
	);
}
