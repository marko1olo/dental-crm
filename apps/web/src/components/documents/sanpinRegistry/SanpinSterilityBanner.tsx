import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Patient } from "@dental/shared";
import { showToast } from "../../GlobalToast";

export interface SanpinSterilityBannerProps {
	patient: Patient | null;
	sterilityVerified: boolean;
	setSterilityVerified: (verified: boolean) => void;
}

export const SanpinSterilityBanner: React.FC<SanpinSterilityBannerProps> = ({
	patient,
	sterilityVerified,
	setSterilityVerified,
}) => {
	return (
		<div
			style={{
				padding: "0.75rem 1rem",
				marginBottom: "1rem",
				borderRadius: "8px",
				background: sterilityVerified ? "rgba(16, 185, 129, 0.08)" : "var(--paper-soft, #f8fafc)",
				border: sterilityVerified ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--line, #e2e8f0)",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: "0.75rem",
				flexWrap: "wrap",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
				<ShieldCheck size={22} color={sterilityVerified ? "#059669" : "var(--teal, #0d9488)"} />
				<div>
					<div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink, #0f172a)" }}>
						{sterilityVerified ? "Стерильность инструментов приёма подтверждена" : "Комплексный допуск стерильности инструментов приёма"}
					</div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: "0.15rem" }}>
						{patient ? `Пациент: ${patient.fullName} • ` : ""}Контроль очистки (азопирам/фенолфталеин отр.) и автоклавирование (134°C, 5 класс норма)
					</div>
				</div>
			</div>
			<button
				type="button"
				className={sterilityVerified ? "secondary-button" : "primary-button"}
				onClick={() => {
					setSterilityVerified(true);
					showToast("Стерильность инструментов приёма подтверждена", "success");
				}}
				style={{ minHeight: "36px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
			>
				<CheckCircle2 size={15} />
				<span>{sterilityVerified ? "Подтверждено в карте" : "Заверить стерильность"}</span>
			</button>
		</div>
	);
};
