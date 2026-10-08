import type { CSSProperties } from "react";

export const visiographContainerStyle: CSSProperties = {
	border: "1px solid var(--line)",
	borderRadius: "14px",
	background: "var(--paper)",
	marginBottom: "12px",
	overflow: "hidden",
};

export const demoScanButtonStyle: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	gap: "6px",
	padding: "0 14px",
	height: "32px",
	borderRadius: "8px",
	fontSize: "0.82rem",
	fontWeight: 500,
	background: "var(--paper)",
	color: "var(--muted)",
	border: "1px dashed var(--line)",
	cursor: "pointer",
};

export const cockpitToolbarStyle: CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "6px",
	flexWrap: "nowrap",
	overflowX: "auto",
	scrollbarWidth: "none",
	padding: "4px 6px",
	background: "var(--paper-soft)",
	border: "1px solid var(--line-subtle)",
	borderRadius: "8px",
	height: "40px",
	minHeight: "40px",
};

export const sanPinBadgeStyle: CSSProperties = {
	fontSize: "0.72rem",
	color: "var(--muted)",
	display: "inline-flex",
	alignItems: "center",
	gap: "4px",
	padding: "2px 6px",
};

export function getNormaButtonStyle(isNormaApplied: boolean): CSSProperties {
	return {
		height: "32px",
		minHeight: "32px",
		padding: "0 8px",
		background: isNormaApplied ? "var(--teal-soft)" : "var(--paper)",
		color: isNormaApplied ? "var(--teal)" : "var(--ink)",
		border: isNormaApplied ? "1px solid var(--teal)" : "1px solid var(--line-strong, var(--line))",
		borderRadius: "8px",
		fontSize: "13px",
		fontWeight: 600,
		cursor: "pointer",
		display: "inline-flex",
		alignItems: "center",
		gap: "5px",
		whiteSpace: "nowrap",
		flexShrink: 0,
		transition: "all 0.15s ease",
	};
}

export function getAiButtonStyle(isAnalyzing: boolean): CSSProperties {
	return {
		height: "32px",
		minHeight: "32px",
		padding: "0 8px",
		background: isAnalyzing ? "var(--paper-soft)" : "var(--teal)",
		color: isAnalyzing ? "var(--muted)" : "var(--on-teal, white)",
		border: "1px solid var(--teal)",
		borderRadius: "8px",
		fontSize: "13px",
		fontWeight: 600,
		cursor: isAnalyzing ? "wait" : "pointer",
		display: "inline-flex",
		alignItems: "center",
		gap: "5px",
		whiteSpace: "nowrap",
		flexShrink: 0,
		transition: "all 0.15s ease",
	};
}

export function getApplyChartButtonStyle(isApplyingToChart: boolean): CSSProperties {
	return {
		padding: "6px 14px",
		background: isApplyingToChart ? "var(--line)" : "var(--teal)",
		color: isApplyingToChart ? "var(--muted)" : "var(--on-teal, white)",
		border: "none",
		borderRadius: "8px",
		fontSize: "0.82rem",
		fontWeight: 700,
		cursor: isApplyingToChart ? "not-allowed" : "pointer",
		display: "flex",
		alignItems: "center",
		gap: "6px",
	};
}
