/**
 * DENTE Dental CRM — Leads Convert Modal Header & Segmented Switcher
 * Mandate 8e & 8n: Solo Doctor Autonomy, Mandate 8b (<= 120 lines)
 */

import { Calendar, UserCheck, X } from "lucide-react";
import React from "react";
import type { LeadConvertMode } from "./leadConvertTypes";

interface LeadConvertModalHeaderProps {
	mode: LeadConvertMode;
	setMode: (mode: LeadConvertMode) => void;
	onClose: () => void;
	borderColor: string;
}

export const LeadConvertModalHeader: React.FC<LeadConvertModalHeaderProps> = ({
	mode,
	setMode,
	onClose,
	borderColor,
}) => {
	const segItemStyle = (active: boolean): React.CSSProperties => ({
		flex: 1,
		padding: "7px 8px",
		borderRadius: 8,
		border: "none",
		cursor: "pointer",
		fontSize: 12,
		fontWeight: active ? 600 : 500,
		background: active ? "var(--paper)" : "transparent",
		color: active ? "var(--teal)" : "var(--muted)",
		boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
		transition: "all 0.15s ease",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	});

	return (
		<>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 14,
				}}
			>
				<h3
					style={{
						margin: 0,
						fontSize: 17,
						fontWeight: 600,
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: 8,
					}}
				>
					{mode === "patient_and_appointment" ? (
						<>
							<Calendar size={19} color="var(--teal)" /> Конвертация и запись на
							приём
						</>
					) : (
						<>
							<UserCheck size={19} color="var(--teal)" /> Создание карты
							пациента
						</>
					)}
				</h3>
				<button
					type="button"
					onClick={onClose}
					style={{
						background: "none",
						border: "none",
						color: "var(--muted)",
						cursor: "pointer",
					}}
					aria-label="Закрыть модальное окно"
				>
					<X size={20} />
				</button>
			</div>

			<div
				style={{
					display: "flex",
					background: "var(--paper-soft)",
					padding: 3,
					borderRadius: 10,
					border: `1px solid ${borderColor}`,
					gap: 3,
					marginBottom: 14,
				}}
			>
				<button
					type="button"
					onClick={() => setMode("patient_only")}
					style={segItemStyle(mode === "patient_only")}
				>
					<UserCheck size={14} /> Только создать карту
				</button>
				<button
					type="button"
					onClick={() => setMode("patient_and_appointment")}
					style={segItemStyle(mode === "patient_and_appointment")}
				>
					<Calendar size={14} /> Карта + запись на приём
				</button>
			</div>
		</>
	);
};
