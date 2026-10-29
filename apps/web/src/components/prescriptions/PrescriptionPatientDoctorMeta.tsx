/**
 * PrescriptionPatientDoctorMeta.tsx — Patient & Doctor Requisite Block
 */

import React from "react";
import type { PrescriptionFormType } from "./prescriptionPreviewTypes";

export interface PrescriptionPatientDoctorMetaProps {
	readonly patientName: string;
	readonly patientBirth: string;
	readonly patientCard: string;
	readonly patientAddress?: string | undefined;
	readonly docName: string;
	readonly docSpecialty: string;
	readonly activeForm: PrescriptionFormType;
	readonly diagnosisIcd10?: string | null | undefined;
}

export const PrescriptionPatientDoctorMeta: React.FC<
	PrescriptionPatientDoctorMetaProps
> = ({
	patientName,
	patientBirth,
	patientCard,
	patientAddress,
	docName,
	docSpecialty,
	activeForm,
	diagnosisIcd10,
}) => {
	const isSpecial = activeForm === "special" || activeForm === "148-1u-88";

	return (
		<div className="border-b border-[var(--line)] pb-2 flex flex-col gap-0.5 text-[11px] leading-snug text-[var(--ink)]">
			<div>
				Ф.И.О. пациента: <strong>{patientName}</strong>
			</div>
			<div className="flex justify-between flex-wrap gap-1">
				<span>
					Дата рождения: <strong>{patientBirth}</strong>
				</span>
				<span>
					№ медкарты: <strong>{patientCard}</strong>
				</span>
			</div>
			{isSpecial && (
				<div>
					Адрес проживания: <strong>{patientAddress || "—"}</strong>
				</div>
			)}
			<div>
				Ф.И.О. лечащего врача: <strong>{docName}</strong> ({docSpecialty})
			</div>
			{diagnosisIcd10 && (
				<div className="text-[10px] text-[var(--muted)] font-sans">
					Диагноз (МКБ-10):{" "}
					<strong className="text-[var(--ink)]">{diagnosisIcd10}</strong>
				</div>
			)}
		</div>
	);
};
