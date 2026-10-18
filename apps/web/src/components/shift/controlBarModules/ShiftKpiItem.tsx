import React from "react";

export interface ShiftKpiItemProps {
	readonly label: string;
	readonly children: React.ReactNode;
	readonly isHighlight?: boolean;
}

export const ShiftKpiItem: React.FC<ShiftKpiItemProps> = ({ label, children, isHighlight }) => (
	<div
		style={{
			padding: "8px 12px",
			borderRadius: "8px",
			background: isHighlight ? "var(--teal-surface, rgba(13, 148, 136, 0.08))" : "var(--paper-soft)",
			border: isHighlight ? "1px solid var(--teal-ring, rgba(13, 148, 136, 0.25))" : "1px solid var(--line)",
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "8px",
			minWidth: 0,
			height: "40px",
		}}
	>
		<span
			style={{
				fontSize: "11px",
				fontWeight: isHighlight ? 700 : 600,
				color: isHighlight ? "var(--teal-dark, #0f766e)" : "var(--muted)",
				textTransform: "uppercase",
				letterSpacing: "0.02em",
				whiteSpace: "nowrap",
			}}
		>
			{label}
		</span>
		{children}
	</div>
);
