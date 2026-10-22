import { AlertTriangle, CheckCircle2, Wind } from "lucide-react";
import React from "react";

export interface CabinetLampStatusBadgeProps {
	readonly lampModel: string;
	readonly selectedCabinet: string;
	readonly operatingHours: number;
	readonly maxLampHours: number;
	readonly lampStatus: "normal" | "warning_replace_soon" | "expired_replace_now";
	readonly remainingPercent: number;
}

export function CabinetLampStatusBadge({
	lampModel,
	selectedCabinet,
	operatingHours,
	maxLampHours,
	lampStatus,
	remainingPercent,
}: CabinetLampStatusBadgeProps) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "1rem",
				flexWrap: "wrap",
				marginBottom: "0.5rem",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<Wind size={19} color="var(--brand-primary, #2563eb)" />
				<div>
					<h3 style={{ fontSize: "0.92rem", fontWeight: 700, margin: 0, color: "var(--ink, #1e293b)" }}>
						Обеззараживание воздуха и контроль ресурса ламп (Дезар)
					</h3>
					<span style={{ fontSize: "0.76rem", color: "var(--muted, #64748b)" }}>
						{lampModel} • {selectedCabinet}
					</span>
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<span
					style={{
						padding: "0.2rem 0.55rem",
						borderRadius: "0.375rem",
						fontSize: "0.75rem",
						fontWeight: 700,
						background:
							lampStatus === "expired_replace_now"
								? "rgba(239, 68, 68, 0.15)"
								: lampStatus === "warning_replace_soon"
									? "rgba(245, 158, 11, 0.15)"
									: "rgba(16, 185, 129, 0.15)",
						color:
							lampStatus === "expired_replace_now"
								? "var(--bad-fg, #ef4444)"
								: lampStatus === "warning_replace_soon"
									? "var(--warn-fg, #b45309)"
									: "var(--ok-fg, #059669)",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.3rem",
					}}
				>
					{lampStatus === "normal" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
					<span>Наработка: {operatingHours} / {maxLampHours} ч ({remainingPercent}% остаток)</span>
				</span>
			</div>
		</div>
	);
}
