import type { SterilizerEquipment } from "@dental/shared";
import { AlertTriangle } from "lucide-react";
import React from "react";

export interface SterilizerFleetCardTechDetailsProps {
	readonly item: SterilizerEquipment;
	readonly isVerificationExpired: boolean;
	readonly isVerificationDueSoon: boolean;
}

export function SterilizerFleetCardTechDetails({
	item,
	isVerificationExpired,
	isVerificationDueSoon,
}: SterilizerFleetCardTechDetailsProps) {
	return (
		<>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "0.35rem 0.6rem",
					fontSize: "0.775rem",
					background: "var(--paper-soft, #f8fafc)",
					padding: "0.5rem",
					borderRadius: "6px",
				}}
			>
				<div>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Серийный номер:</span>
					<span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--ink, #0f172a)" }}>
						{item.serialNumber}
					</span>
				</div>

				<div>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Инвентарный №:</span>
					<span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--ink, #0f172a)" }}>
						{item.inventoryNumber || "—"}
					</span>
				</div>

				<div style={{ gridColumn: "1 / -1" }}>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Помещение:</span>
					<span style={{ fontWeight: 500, color: "var(--ink, #0f172a)" }}>
						{item.locationRoom || "ЦСО (Стерилизационная)"}
					</span>
				</div>

				<div>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Поверка годна до:</span>
					{item.verificationExpiryDate ? (
						<span
							style={{
								fontWeight: 700,
								color: isVerificationExpired ? "var(--bad-fg)" : isVerificationDueSoon ? "var(--warn-fg)" : "var(--ok-fg)",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.2rem",
							}}
						>
							{isVerificationExpired && <AlertTriangle size={11} />}
							{new Date(item.verificationExpiryDate).toLocaleDateString("ru-RU")}
						</span>
					) : (
						<span style={{ color: "var(--muted, #64748b)" }}>Не указана</span>
					)}
				</div>

				<div>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Следующее ТО:</span>
					<span style={{ fontWeight: 500, color: "var(--ink, #0f172a)" }}>
						{item.nextMaintenanceDate ? new Date(item.nextMaintenanceDate).toLocaleDateString("ru-RU") : "По графику"}
					</span>
				</div>
			</div>

			{item.notes && (
				<div style={{ fontSize: "0.725rem", color: "var(--muted, #64748b)", fontStyle: "italic" }}>
					{item.notes}
				</div>
			)}
		</>
	);
}
