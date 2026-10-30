import type { Patient } from "@dental/shared";
import { ShieldCheck } from "lucide-react";
import React from "react";
import { formatShortDate } from "../../../AppHelpers";

export interface ClinicalPackagePatientCardProps {
	readonly patient: Patient | null;
	readonly doctorFullName?: string | null | undefined;
	readonly missingCount: number;
}

export function ClinicalPackagePatientCard({
	patient,
	doctorFullName,
	missingCount,
}: ClinicalPackagePatientCardProps): React.JSX.Element {
	return (
		<div className="document-package-patient-card">
			<div>
				<strong>{patient ? patient.fullName : "Пациент не выбран"}</strong>
				<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
					{doctorFullName
						? `Лечащий врач: ${doctorFullName}`
						: "Врач: Текущая смена"}
					{patient?.birthDate ? ` · ${formatShortDate(patient.birthDate)}` : ""}
				</div>
			</div>
			<span className="document-patient-badge">
				<ShieldCheck size={14} aria-hidden="true" />
				{missingCount === 0
					? "Все 5 бланков оформлены"
					: `Готово ${5 - missingCount} из 5 бланков`}
			</span>
		</div>
	);
}
