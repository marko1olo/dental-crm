import type { SterilizerEquipmentStatus } from "@dental/shared";
import { CheckCircle2, RotateCcw, Wrench } from "lucide-react";
import React from "react";
import { SterilizerDecommissionConfirmBox } from "./SterilizerDecommissionConfirmBox.js";

export interface SterilizerQuickStatusActionsProps {
	readonly status: SterilizerEquipmentStatus;
	readonly submitting: boolean;
	readonly onQuickMaintenance: () => void;
	readonly onQuickReturnToService: () => void;
	readonly onQuickDecommission: (reason?: string) => void;
	readonly decommissionReason: string;
	readonly setDecommissionReason: (r: string) => void;
	readonly showDecommissionConfirm: boolean;
	readonly setShowDecommissionConfirm: (show: boolean) => void;
}

export function SterilizerQuickStatusActions({
	status,
	submitting,
	onQuickMaintenance,
	onQuickReturnToService,
	onQuickDecommission,
	decommissionReason,
	setDecommissionReason,
	showDecommissionConfirm,
	setShowDecommissionConfirm,
}: SterilizerQuickStatusActionsProps) {
	return (
		<div
			style={{
				padding: "0.75rem",
				borderRadius: "8px",
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				display: "flex",
				flexDirection: "column",
				gap: "0.5rem",
			}}
		>
			<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
				Быстрые действия технического статуса:
			</span>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
				{status === "active" && (
					<button
						type="button"
						onClick={onQuickMaintenance}
						aria-busy={submitting}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#d97706" }}
					>
						<Wrench size={14} /> Вывести на техобслуживание (ТО)
					</button>
				)}

				{status === "in_maintenance" && (
					<button
						type="button"
						onClick={onQuickReturnToService}
						aria-busy={submitting}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#059669" }}
					>
						<CheckCircle2 size={14} /> Вернуть в строй (ТО завершено)
					</button>
				)}

				{status !== "decommissioned" && (
					<SterilizerDecommissionConfirmBox
						showDecommissionConfirm={showDecommissionConfirm}
						setShowDecommissionConfirm={setShowDecommissionConfirm}
						decommissionReason={decommissionReason}
						setDecommissionReason={setDecommissionReason}
						submitting={submitting}
						onQuickDecommission={onQuickDecommission}
					/>
				)}

				{status === "decommissioned" && (
					<button
						type="button"
						onClick={onQuickReturnToService}
						aria-busy={submitting}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#2563eb" }}
					>
						<RotateCcw size={14} /> Восстановить аппарат в строй
					</button>
				)}
			</div>
		</div>
	);
}
