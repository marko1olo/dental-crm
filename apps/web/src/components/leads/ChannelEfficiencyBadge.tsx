/**
 * DENTE Dental CRM — Channel Efficiency Badge
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { ChannelFunnelMetric } from "./leadsFunnelTypes";

interface ChannelEfficiencyBadgeProps {
	rating: ChannelFunnelMetric["efficiencyRating"];
	recommendation?: string;
}

export const ChannelEfficiencyBadge: React.FC<ChannelEfficiencyBadgeProps> = ({
	rating,
	recommendation,
}) => {
	const badgeStyle = (bg: string, color: string, weight = 600): React.CSSProperties => ({
		background: bg,
		color,
		padding: "2px 6px",
		borderRadius: 4,
		fontWeight: weight,
	});

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
			{rating === "excellent" && (
				<span style={badgeStyle("rgba(16, 185, 129, 0.15)", "var(--ok-fg)", 700)}>
					ТОП
				</span>
			)}
			{rating === "good" && (
				<span style={badgeStyle("rgba(59, 130, 246, 0.15)", "var(--accent)")}>
					В плюсе
				</span>
			)}
			{rating === "warning" && (
				<span style={badgeStyle("rgba(245, 158, 11, 0.15)", "var(--warn-fg)")}>
					В ноль
				</span>
			)}
			{rating === "critical" && (
				<span style={badgeStyle("rgba(239, 68, 68, 0.15)", "var(--rust)")}>
					Убыток
				</span>
			)}
			{rating === "organic" && (
				<span style={badgeStyle("rgba(139, 92, 246, 0.15)", "var(--accent)")}>
					Органика / Сарафан
				</span>
			)}
			{recommendation && <span style={{ color: "var(--muted)" }}>{recommendation}</span>}
		</div>
	);
};
