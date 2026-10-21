/**
 * DENTE Dental CRM — Lead Form Header & Badges
 * Mandate 8b (<= 120 lines)
 */

import { Edit2, X } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { LeadFormContactBar } from "./LeadFormContactBar";
import { LeadFormPatientAndAudioBadges } from "./LeadFormPatientAndAudioBadges";

interface LeadFormHeaderProps {
	isNew: boolean;
	currentLead: Lead | null;
	borderColor: string;
	onClose: () => void;
	onOpenPatient: (patientId: string) => void;
}

export const LeadFormHeader: React.FC<LeadFormHeaderProps> = ({
	isNew,
	currentLead,
	borderColor,
	onClose,
	onOpenPatient,
}) => {
	return (
		<>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 16,
				}}
			>
				<h3
					style={{
						margin: 0,
						fontSize: 18,
						fontWeight: 600,
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: 8,
					}}
				>
					<Edit2 size={20} color="var(--teal)" />
					{isNew ? "Добавить обращение" : "Редактировать обращение"}
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

			{currentLead && (
				<LeadFormContactBar currentLead={currentLead} borderColor={borderColor} />
			)}

			<LeadFormPatientAndAudioBadges
				currentLead={currentLead}
				borderColor={borderColor}
				onOpenPatient={onOpenPatient}
			/>
		</>
	);
};
