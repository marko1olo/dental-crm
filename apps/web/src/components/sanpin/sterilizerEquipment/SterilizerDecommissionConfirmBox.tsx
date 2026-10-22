import { Archive } from "lucide-react";
import React from "react";

export interface SterilizerDecommissionConfirmBoxProps {
	readonly showDecommissionConfirm: boolean;
	readonly setShowDecommissionConfirm: (show: boolean) => void;
	readonly decommissionReason: string;
	readonly setDecommissionReason: (r: string) => void;
	readonly submitting: boolean;
	readonly onQuickDecommission: (reason?: string) => void;
}

export function SterilizerDecommissionConfirmBox({
	showDecommissionConfirm,
	setShowDecommissionConfirm,
	decommissionReason,
	setDecommissionReason,
	submitting,
	onQuickDecommission,
}: SterilizerDecommissionConfirmBoxProps) {
	if (!showDecommissionConfirm) {
		return (
			<button
				type="button"
				onClick={() => setShowDecommissionConfirm(true)}
				aria-busy={submitting}
				className="sanpin-btn sanpin-btn-secondary touch-manipulation"
				style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#dc2626" }}
			>
				<Archive size={14} /> Списать с баланса клиники
			</button>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.35rem",
				padding: "0.5rem",
				background: "rgba(220, 38, 38, 0.06)",
				borderRadius: "6px",
				border: "1px solid rgba(220, 38, 38, 0.25)",
				width: "100%",
			}}
		>
			<label
				htmlFor="sterilizer-decommission-reason"
				style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink, #0f172a)" }}
			>
				Основание списания (дефектация, износ, замена):
			</label>
			<input
				id="sterilizer-decommission-reason"
				type="text"
				value={decommissionReason}
				onChange={(e) => setDecommissionReason(e.target.value)}
				placeholder="Акт технической экспертизы и дефектации № "
				className="sanpin-input"
				style={{ minHeight: "32px", fontSize: "0.78rem" }}
			/>
			<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem" }}>
				<button
					type="button"
					onClick={() => void onQuickDecommission(decommissionReason)}
					aria-busy={submitting}
					className="sanpin-btn touch-manipulation"
					style={{ minHeight: "30px", padding: "0.2rem 0.6rem", background: "#dc2626", color: "#fff", fontSize: "0.75rem", fontWeight: 700, border: "none", borderRadius: "4px" }}
				>
					Подтвердить списание
				</button>
				<button
					type="button"
					onClick={() => setShowDecommissionConfirm(false)}
					aria-busy={submitting}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation"
					style={{ minHeight: "30px", padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
				>
					Отмена
				</button>
			</div>
		</div>
	);
}
