import { EyeOff } from "lucide-react";
import React from "react";

export interface PatientAnonymousIntakeCardProps {
	readonly isAnonymous: boolean;
	readonly onToggleAnonymous: () => void;
}

export function PatientAnonymousIntakeCard({
	isAnonymous,
	onToggleAnonymous,
}: PatientAnonymousIntakeCardProps) {
	return (
		<div
			style={{
				marginBottom: "12px",
				padding: "10px 12px",
				borderRadius: "8px",
				border: isAnonymous
					? "1px solid rgba(245, 158, 11, 0.4)"
					: "1px solid var(--glass-border)",
				backgroundColor: isAnonymous
					? "rgba(245, 158, 11, 0.08)"
					: "var(--glass-panel)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
				<EyeOff
					size={18}
					style={{
						flexShrink: 0,
						color: isAnonymous ? "var(--warning-fg, #f59e0b)" : "var(--muted)",
					}}
				/>
				<div style={{ fontSize: "12px" }}>
					<div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
						Анонимный приём
						{isAnonymous && (
							<span
								style={{
									fontSize: "10px",
									fontWeight: "bold",
									padding: "1px 6px",
									borderRadius: "4px",
									backgroundColor: "var(--warning-fg, #b45309)",
									color: "var(--paper-strong, #ffffff)",
								}}
							>
								АКТИВЕН
							</span>
						)}
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)" }}>
						{isAnonymous
							? "Паспорт и СНИЛС не требуются. Оплата только коммерческая (ОМС запрещён законом)."
							: "Режим создания карты без паспорта с фиксацией со слов пациента"}
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
					backgroundColor: isAnonymous ? "var(--warning-fg, #b45309)" : "var(--paper-strong)",
					color: isAnonymous ? "var(--paper-strong, #ffffff)" : "var(--ink)",
					border: "1px solid var(--glass-border)",
					minHeight: "36px",
				}}
				onClick={onToggleAnonymous}
			>
				{isAnonymous ? "Отключить" : "Включить"}
			</button>
		</div>
	);
}
