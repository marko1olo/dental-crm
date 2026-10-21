import { Zap } from "lucide-react";
import React from "react";

export interface PatientEmergencyIntakeCardProps {
	readonly isEmergencyOrPrimary: boolean;
	readonly onToggleEmergency: () => void;
}

export function PatientEmergencyIntakeCard({
	isEmergencyOrPrimary,
	onToggleEmergency,
}: PatientEmergencyIntakeCardProps) {
	return (
		<div
			style={{
				marginBottom: "10px",
				padding: "10px 12px",
				borderRadius: "8px",
				border: isEmergencyOrPrimary
					? "1px solid rgba(244, 63, 94, 0.4)"
					: "1px solid var(--glass-border)",
				backgroundColor: isEmergencyOrPrimary
					? "rgba(244, 63, 94, 0.08)"
					: "var(--glass-panel)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
				<Zap
					size={18}
					style={{
						flexShrink: 0,
						color: isEmergencyOrPrimary ? "var(--bad-fg, #f43f5e)" : "var(--muted)",
					}}
				/>
				<div style={{ fontSize: "12px" }}>
					<div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
						⚡ Срочный приём (Острая боль)
						{isEmergencyOrPrimary && (
							<span
								style={{
									fontSize: "10px",
									fontWeight: "bold",
									padding: "1px 6px",
									borderRadius: "4px",
									backgroundColor: "var(--bad-fg, #f43f5e)",
									color: "var(--paper-strong, #ffffff)",
								}}
							>
								АКТИВЕН
							</span>
						)}
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)" }}>
						{isEmergencyOrPrimary
							? "СНИЛС, паспорт и источник обращения не блокируют запись. Документы можно внести позже."
							: "Быстрое создание карты для экстренного пациента без паспорта и СНИЛС"}
					</div>
				</div>
			</div>
			<button
				type="button"
				style={{
					padding: "6px 12px",
					fontSize: "12px",
					fontWeight: 600,
					borderRadius: "6px",
					cursor: "pointer",
					flexShrink: 0,
					backgroundColor: isEmergencyOrPrimary ? "var(--bad-fg, #f43f5e)" : "var(--paper-strong)",
					color: isEmergencyOrPrimary ? "var(--paper-strong, #ffffff)" : "var(--ink)",
					border: "1px solid var(--glass-border)",
					minHeight: "36px",
				}}
				onClick={onToggleEmergency}
				data-testid="patient-create-emergency-toggle"
			>
				{isEmergencyOrPrimary ? "Отключить" : "Включить"}
			</button>
		</div>
	);
}
