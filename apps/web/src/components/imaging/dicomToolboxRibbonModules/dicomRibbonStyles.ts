import type React from "react";

export const dropdownSectionHeaderStyle: React.CSSProperties = {
	fontSize: "12px",
	fontWeight: 800,
	color: "#94a3b8",
	padding: "4px 6px",
	textTransform: "uppercase",
	borderBottom: "1px solid #1e293b",
};

export const menuItemStyle: React.CSSProperties = {
	textAlign: "left",
	padding: "6px 8px",
	fontSize: "12px",
	borderRadius: "5px",
	background: "transparent",
	border: "none",
	color: "#e2e8f0",
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
	color: "#cbd5e1",
	cursor: "pointer",
	userSelect: "none",
};

export const selectInputStyle: React.CSSProperties = {
	width: "100%",
	height: "26px",
	backgroundColor: "#1e293b",
	border: "1px solid #334155",
	borderRadius: "6px",
	color: "#f8fafc",
	fontSize: "12px",
	padding: "0 6px",
};

export const numberInputStyle: React.CSSProperties = {
	width: "80px",
	height: "26px",
	backgroundColor: "#1e293b",
	border: "1px solid #475569",
	borderRadius: "6px",
	color: "#f8fafc",
	fontSize: "12px",
	fontWeight: 700,
	fontFamily: "monospace",
	textAlign: "right",
	padding: "0 6px",
};

export const statPillStyle: React.CSSProperties = {
	backgroundColor: "#020617",
	border: "1px solid #1e293b",
	borderRadius: "6px",
	padding: "6px 8px",
	display: "flex",
	flexDirection: "column",
	gap: "2px",
};
