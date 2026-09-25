/**
 * DENTE Dental CRM — Marketing ROMI Table Footer.
 */

import React from "react";
import type { MarketingRomiSummaryResult } from "@dental/shared";

export interface MarketingRomiTableFooterProps {
	readonly summary: MarketingRomiSummaryResult;
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
				<td className="romi-total-num text-right">
					{summary.totalSpentFormatted}
				</td>
				<td className="romi-total-num text-center font-bold">
					{summary.totalLeadsCount} чел.
				</td>
				<td className="romi-total-center font-bold text-[var(--teal-dark)]">
					{summary.overallShowUpRatePercent}%
				</td>
				<td className="romi-total-num text-center font-bold">
					{summary.totalPrimaryPatientsCount} чел.
				</td>
				<td className="romi-total-num text-right font-bold text-[var(--teal-dark)]">
					{summary.totalRevenueFormatted}
				</td>
				<td className="romi-total-num text-right font-medium">
					{summary.overallAverageCheckFormatted}
				</td>
				<td className="romi-total-num text-center font-bold">
					{summary.totalRepeatVisitsCount} чел.
				</td>
				<td className="romi-total-center font-bold text-[var(--teal-dark)]">
					{summary.overallRepeatRatePercent}%
				</td>
				<td className="romi-total-num text-right font-bold text-[var(--teal-dark)]">
					{summary.overallLtvFormatted}
				</td>
				<td className="romi-total-center">
					<span className={`romi-badge total ${totalBadgeClass}`}>
						{summary.overallRomiFormatted}
					</span>
				</td>
				<td className="romi-total-num text-right">
					{summary.overallCacFormatted}
				</td>
				<td></td>
			</tr>
		</tfoot>
	);
}
