import React from "react";
import { AlertCircle, Check, CheckCircle2, RefreshCw } from "lucide-react";
import type { EmkAutosaveState } from "./types";

export interface EmkAutosaveStatusBadgeProps {
	readonly state?: EmkAutosaveState;
	readonly status?: EmkAutosaveState["status"];
	readonly lastSavedAtIso?: string | null;
	readonly className?: string;
}

export function EmkAutosaveStatusBadge({
	state,
	status = state?.status || "saved",
	lastSavedAtIso = state?.lastSavedAtIso,
	className,
}: EmkAutosaveStatusBadgeProps) {
	if (status === "saving") {
		return (
			<div
				className={className}
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
					fontSize: "12px",
					color: "var(--ink-2, #64748b)",
					padding: "3px 8px",
					borderRadius: "6px",
					background: "var(--paper-strong, #f1f5f9)",
				}}
			>
				<RefreshCw size={12} className="animate-spin" />
				<span>Автосохранение черновика...</span>
			</div>
		);
	}

	if (status === "error") {
		return (
			<div
				className={className}
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
					fontSize: "12px",
					color: "var(--bad, #ef4444)",
					padding: "3px 8px",
					borderRadius: "6px",
					background: "rgba(239, 68, 68, 0.08)",
					border: "1px solid rgba(239, 68, 68, 0.2)",
				}}
			>
				<AlertCircle size={12} />
				<span>Ошибка сохранения</span>
			</div>
		);
	}

	if (status === "offline_queued") {
		return (
			<div
				className={className}
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
					fontSize: "12px",
					color: "var(--warn, #f59e0b)",
					padding: "3px 8px",
					borderRadius: "6px",
					background: "rgba(245, 158, 11, 0.08)",
					border: "1px solid rgba(245, 158, 11, 0.2)",
				}}
			>
				<Check size={12} />
				<span>Сохранено офлайн (IDB)</span>
			</div>
		);
	}

	return (
		<div
			className={className}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "5px",
				fontSize: "12px",
				color: "var(--good, #10b981)",
				padding: "3px 8px",
				borderRadius: "6px",
				background: "rgba(16, 185, 129, 0.08)",
			}}
		>
			<CheckCircle2 size={12} />
			<span>
				Черновик сохранён
				{lastSavedAtIso ? ` (${new Date(lastSavedAtIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : ""}
			</span>
		</div>
	);
}
