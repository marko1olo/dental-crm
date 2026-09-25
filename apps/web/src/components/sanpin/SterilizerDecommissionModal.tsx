import type { SterilizerEquipment } from "@dental/shared";
import { Archive } from "lucide-react";
import React from "react";

export interface SterilizerDecommissionModalProps {
	readonly target: SterilizerEquipment | null;
	readonly reason: string;
	readonly setReason: (r: string) => void;
	readonly submitting: boolean;
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
}

export function SterilizerDecommissionModal({
	target,
	reason,
	setReason,
	submitting,
	onConfirm,
	onCancel,
}: SterilizerDecommissionModalProps) {
	if (!target) return null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				backgroundColor: "rgba(15, 23, 42, 0.6)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
				padding: "1rem",
			}}
		>
			<div
				style={{
					background: "var(--paper-strong, #ffffff)",
					borderRadius: "12px",
					boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
					maxWidth: "480px",
					width: "100%",
					padding: "1.25rem",
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#dc2626" }}>
					<Archive size={20} />
					<h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						Списание аппарата с баланса
					</h3>
				</div>

				<p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted, #64748b)", lineHeight: 1.4 }}>
					Подтверждаете списание аппарата <strong>«{target.name}»</strong>? Он будет выведен из эксплуатации и исключен из текущего цикла стерилизации.
				</p>

				<div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
					<label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
						Основание списания (Акт дефектации, износ, замена):
					</label>
					<input
						type="text"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Акт технической экспертизы и дефектации № "
						className="sanpin-input"
						style={{ minHeight: "36px", fontSize: "0.85rem" }}
						autoFocus
					/>
				</div>

				<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.25rem" }}>
					<button
						type="button"
						onClick={onCancel}
						aria-busy={submitting}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "34px", padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={onConfirm}
						aria-busy={submitting}
						className="sanpin-btn touch-manipulation"
						style={{
							minHeight: "34px",
							padding: "0.3rem 1rem",
							background: "#dc2626",
							color: "#ffffff",
							fontSize: "0.8rem",
							fontWeight: 700,
							border: "none",
							borderRadius: "6px",
						}}
					>
						{submitting ? "Списание..." : "Подтвердить списание"}
					</button>
				</div>
			</div>
		</div>
	);
}
