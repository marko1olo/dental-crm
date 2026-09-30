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
	flexWrap: "wrap",
	padding: "4px 8px",
	background: "var(--paper-soft)",
	border: "1px solid var(--line)",
	borderRadius: "8px",
	minHeight: "34px",
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
		height: "30px",
		minHeight: "30px",
		padding: "0 10px",
		background: isNormaApplied ? "rgba(16, 185, 129, 0.2)" : "var(--paper)",
		color: isNormaApplied ? "#059669" : "var(--ink)",
		border: `1px solid ${isNormaApplied ? "#10b981" : "var(--line)"}`,
		borderRadius: "6px",
		fontSize: "0.78rem",
		fontWeight: 600,
		cursor: "pointer",
		display: "inline-flex",
		alignItems: "center",
		gap: "5px",
	};
}

export function getAiButtonStyle(isAnalyzing: boolean): CSSProperties {
	return {
		height: "30px",
		minHeight: "30px",
		padding: "0 10px",
		background: isAnalyzing ? "var(--paper-soft)" : "var(--teal)",
		color: isAnalyzing ? "var(--muted)" : "var(--on-teal, white)",
		border: "1px solid var(--teal)",
		borderRadius: "6px",
		fontSize: "0.78rem",
		fontWeight: 600,
		cursor: isAnalyzing ? "wait" : "pointer",
		display: "inline-flex",
		alignItems: "center",
		gap: "5px",
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
