/**
 * DENTE Dental CRM — Funnel Waterfall Compact Strip Component
 * Mandate 8b (<= 120 lines)
 */

import { ChevronDown } from "lucide-react";
import React from "react";
import type { FunnelStageMetric } from "./leadsFunnelTypes";

interface FunnelWaterfallCompactStripProps {
	stages: readonly FunnelStageMetric[];
	onToggle: () => void;
}

export const FunnelWaterfallCompactStrip: React.FC<FunnelWaterfallCompactStripProps> = ({
	stages,
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
		<div style={stripStyle} data-testid="leads-waterfall-compact-strip">
			<span style={{ color: "var(--muted)" }}>
				6 клинических этапов: <strong style={{ color: "var(--ink)" }}>{stages[0]?.count ?? 0}</strong> лидов →{" "}
				<strong style={{ color: "var(--teal)" }}>{stages[2]?.count ?? 0}</strong> записей →{" "}
				<strong style={{ color: "var(--warn-fg)" }}>{stages[3]?.count ?? 0}</strong> явок (Show-up) →{" "}
				<strong style={{ color: "var(--ok-fg)" }}>{stages[5]?.count ?? 0}</strong> оплат в кассу.
			</span>
			<button type="button" onClick={onToggle} style={expandBtnStyle}>
				<span>Развернуть воронку</span>
				<ChevronDown size={13} />
			</button>
		</div>
	);
};
