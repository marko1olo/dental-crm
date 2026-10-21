/**
 * DENTE Dental CRM — Funnel Channels Table Row
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { ChannelEfficiencyBadge } from "./ChannelEfficiencyBadge";
import type { ChannelFunnelMetric } from "./leadsFunnelTypes";

export const FunnelChannelsTableRow: React.FC<{ ch: ChannelFunnelMetric }> = ({
	ch,
}) => {
	const romiColor =
		ch.romiPercent >= 100
			? "var(--ok-fg)"
			: ch.romiPercent >= 0
				? "var(--warn-fg)"
				: "var(--rust)";
	return (
		<tr
			style={{
				borderBottom: "1px solid var(--line)",
				transition: "background 0.15s",
			}}
		>
			<td style={{ padding: "10px 8px", fontWeight: 600 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
					<span
						style={{
							width: 8,
							height: 8,
							borderRadius: "50%",
							background: ch.color,
							display: "inline-block",
						}}
					/>
					{ch.channelLabel}
				</div>
			</td>
			<td style={{ padding: "10px 8px", fontWeight: 500 }}>
				{ch.spendRub.toLocaleString("ru-RU")} ₽
			</td>
			<td style={{ padding: "10px 8px", fontWeight: 600 }}>{ch.leadsCount}</td>
			<td
				style={{ padding: "10px 8px", color: "var(--teal)", fontWeight: 600 }}
			>
				{ch.cplRub > 0 ? `${ch.cplRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
			</td>
			<td style={{ padding: "10px 8px" }}>{ch.bookedCount}</td>
			<td style={{ padding: "10px 8px" }}>{ch.showUpCount}</td>
			<td
				style={{
					padding: "10px 8px",
					fontWeight: 700,
					color: ch.paidCount > 0 ? "var(--ok-fg)" : "var(--ink)",
				}}
			>
				{ch.paidCount}
			</td>
			<td style={{ padding: "10px 8px", fontWeight: 600 }}>
				{ch.conversionRatePercent}%
			</td>
			<td style={{ padding: "10px 8px", fontWeight: 700 }}>
				{ch.revenueRub.toLocaleString("ru-RU")} ₽
			</td>
			<td style={{ padding: "10px 8px", color: "var(--muted)" }}>
				{ch.cacRub > 0 ? `${ch.cacRub.toLocaleString("ru-RU")} ₽` : "—"}
			</td>
			<td style={{ padding: "10px 8px" }}>
				<span style={{ fontWeight: 700, color: romiColor }}>
					{ch.spendRub > 0 ? `${ch.romiPercent}%` : "Органика"}
				</span>
			</td>
			<td style={{ padding: "10px 8px", fontSize: 11 }}>
				<ChannelEfficiencyBadge
					rating={ch.efficiencyRating}
					recommendation={ch.recommendation}
				/>
			</td>
		</tr>
	);
};
