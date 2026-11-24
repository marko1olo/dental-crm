import type React from "react";

export const dropdownSectionHeaderStyle: React.CSSProperties = {
	fontSize: "12px",
	fontWeight: 700,
	color: "var(--ink-muted)",
	padding: "4px 6px",
	borderBottom: "1px solid var(--line)",
};

export const menuItemStyle: React.CSSProperties = {
	textAlign: "left",
	padding: "6px 8px",
	fontSize: "12px",
	borderRadius: "6px",
	background: "transparent",
	border: "none",
	color: "var(--ink)",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	gap: "8px",
	transition: "background 0.15s ease",
};

export const checkboxLabelStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "6px",
	fontSize: "12px",
	color: "var(--ink)",
	cursor: "pointer",
	userSelect: "none",
};

export const selectInputStyle: React.CSSProperties = {
	width: "100%",
	height: "28px",
	backgroundColor: "var(--paper-soft)",
	border: "1px solid var(--line)",
	borderRadius: "6px",
	color: "var(--ink)",
	fontSize: "12px",
	padding: "0 6px",
};

export const numberInputStyle: React.CSSProperties = {
	width: "80px",
	height: "28px",
	backgroundColor: "var(--paper-soft)",
	border: "1px solid var(--line)",
	borderRadius: "6px",
	color: "var(--ink)",
	fontSize: "12px",
	fontWeight: 600,
	fontFamily: "monospace",
	textAlign: "right",
	padding: "0 6px",
};

export const statPillStyle: React.CSSProperties = {
	backgroundColor: "var(--paper)",
	border: "1px solid var(--line)",
	borderRadius: "6px",
	padding: "6px 8px",
	display: "flex",
	flexDirection: "column",
	gap: "2px",
};
