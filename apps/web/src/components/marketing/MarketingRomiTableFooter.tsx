/**
 * DENTE Dental CRM — Marketing ROMI Table Footer.
 */

import React from "react";
import type { MarketingRomiSummary } from "@dental/shared";

export interface MarketingRomiTableFooterProps {
	readonly summary: MarketingRomiSummary;
}

export function MarketingRomiTableFooter({ summary }: MarketingRomiTableFooterProps) {
	const totalBadgeClass =
		summary.overallRomiPercent === null
			? "neutral"
			: summary.overallRomiPercent >= 0
				? "positive"
				: "negative";

	return (
		<tfoot>
			<tr className="romi-total-row">
				<td className="romi-total-title">
					ИТОГО ПО ВСЕМ КАНАЛАМ:
				</td>
				<td className="romi-total-num text-right tabular-nums font-mono">
					{summary.totalSpentFormatted}
				</td>
				<td className="romi-total-num text-center font-bold tabular-nums font-mono">
					{summary.totalLeadsCount} чел.
				</td>
				<td className="romi-total-center font-bold text-[var(--teal-dark)] tabular-nums font-mono">
					{summary.overallShowUpRatePercent}%
				</td>
				<td className="romi-total-num text-center font-bold tabular-nums font-mono">
					{summary.totalPrimaryPatientsCount} чел.
				</td>
				<td className="romi-total-num text-right font-bold text-[var(--teal-dark)] tabular-nums font-mono">
					{summary.totalRevenueFormatted}
				</td>
				<td className="romi-total-num text-right font-medium tabular-nums font-mono">
					{summary.overallAverageCheckFormatted}
				</td>
				<td className="romi-total-num text-center font-bold tabular-nums font-mono">
					{summary.totalRepeatVisitsCount} чел.
				</td>
				<td className="romi-total-center font-bold text-[var(--teal-dark)] tabular-nums font-mono">
					{summary.overallRepeatRatePercent}%
				</td>
				<td className="romi-total-num text-right font-bold text-[var(--teal-dark)] tabular-nums font-mono">
					{summary.overallLtvFormatted}
				</td>
				<td className="romi-total-center">
					<span className={`romi-badge total ${totalBadgeClass} tabular-nums font-mono`}>
						{summary.overallRomiFormatted}
					</span>
				</td>
				<td className="romi-total-num text-right tabular-nums font-mono">
					{summary.overallCacFormatted}
				</td>
				<td></td>
			</tr>
		</tfoot>
	);
}
