/**
 * DENTE Dental CRM — Funnel Channels Compact Strip Component
 * Mandate 8b (<= 120 lines)
 */

import { ChevronDown } from "lucide-react";
import React from "react";
import type { MarketingMetricsSummary } from "./leadsFunnelTypes";

interface FunnelChannelsCompactStripProps {
	channelsLength: number;
	summary: MarketingMetricsSummary;
	onToggle: () => void;
}

export const FunnelChannelsCompactStrip: React.FC<FunnelChannelsCompactStripProps> = ({
	channelsLength,
	summary,
	onToggle,
}) => {
	const stripStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		fontSize: 12,
		padding: "10px 14px",
		background: "var(--paper-soft)",
		borderRadius: 10,
		border: "1px solid var(--line)",
		flexWrap: "wrap",
		gap: 8,
	};
	const expandBtnStyle: React.CSSProperties = {
		background: "none",
		border: "none",
		color: "var(--teal)",
		fontWeight: 600,
		cursor: "pointer",
		fontSize: 12,
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
	};

	return (
		<div style={stripStyle} data-testid="channels-compact-strip">
			<span style={{ color: "var(--muted)" }}>
				Рекламных каналов: <strong style={{ color: "var(--ink)" }}>{channelsLength}</strong> •
				Бюджет: <strong style={{ color: "var(--ink)" }}>{summary.totalMarketingSpendRub.toLocaleString("ru-RU")} ₽</strong> •
				CPL: <strong style={{ color: "var(--teal)" }}>{summary.cplRub.toLocaleString("ru-RU")} ₽</strong> •
				CAC: <strong style={{ color: "var(--accent)" }}>{summary.cacRub.toLocaleString("ru-RU")} ₽</strong> •
				Выручка: <strong style={{ color: "var(--ok-fg)" }}>{summary.totalRevenueRub.toLocaleString("ru-RU")} ₽</strong>
			</span>
			<button type="button" onClick={onToggle} style={expandBtnStyle}>
				<span>Развернуть таблицу каналов</span>
				<ChevronDown size={13} />
			</button>
		</div>
	);
};
