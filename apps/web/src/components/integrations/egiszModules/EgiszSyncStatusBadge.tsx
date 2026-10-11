import React from "react";
import { ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";

export interface EgiszSyncStatusBadgeProps {
	readonly statusKind?: "ready" | "loading" | "error" | "not_configured";
	readonly label?: string;
}

export const EgiszSyncStatusBadge: React.FC<EgiszSyncStatusBadgeProps> = ({
	statusKind = "ready",
	label,
}) => {
	const text = label || (statusKind === "ready" ? "Права проверены" : "Синхронизация");

	const Icon =
		statusKind === "ready"
			? UserCheck
			: statusKind === "error"
				? ShieldAlert
				: ShieldCheck;

	const borderColor =
		statusKind === "ready"
			? "var(--teal, #0d9488)"
			: statusKind === "error"
				? "var(--line, #e2e8f0)"
				: "var(--line, #e2e8f0)";

	const textColor =
		statusKind === "ready"
			? "var(--teal, #0d9488)"
			: "var(--muted, #64748b)";

	return (
		<span
			data-testid="egisz-sync-status-badge"
			style={{
				height: 28,
				padding: "0 10px",
				borderRadius: 8,
				border: `1px solid ${borderColor}`,
				background: "var(--paper-soft)",
				color: textColor,
				fontSize: 11,
				fontWeight: 600,
				display: "inline-flex",
				alignItems: "center",
				gap: 5,
				userSelect: "none",
			}}
		>
			<Icon size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
			<span>{text}</span>
		</span>
	);
};
