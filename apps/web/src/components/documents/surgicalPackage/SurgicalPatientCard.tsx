import React from "react";
import { ShieldCheck } from "lucide-react";
import type { Patient } from "@dental/shared";
import { formatShortDate } from "../../../AppHelpers";
import { SURGICAL_STATUTORY_ITEMS } from "./types";

export interface SurgicalPatientCardProps {
	patient: Patient | null;
	doctorFullName?: string | null;
	missingCount: number;
}

export const SurgicalPatientCard: React.FC<SurgicalPatientCardProps> = ({
	patient,
	doctorFullName,
	missingCount,
}) => {
	const total = SURGICAL_STATUTORY_ITEMS.length;
	const ready = total - missingCount;

	return (
		<div className="document-package-patient-card">
			<div>
				<strong>{patient ? patient.fullName : "Пациент не выбран"}</strong>
				<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
					{doctorFullName ? `Хирург: ${doctorFullName}` : "Хирург: Текущая смена"}
					{patient?.birthDate ? ` · ${formatShortDate(patient.birthDate)}` : ""}
				</div>
			</div>
			<span className="document-patient-badge">
				<ShieldCheck size={14} aria-hidden="true" />
				{missingCount === 0
					? "Все 6 хирургических документов укомплектованы"
					: `Готово ${ready} из ${total} документов`}
			</span>
		</div>
	);
};
