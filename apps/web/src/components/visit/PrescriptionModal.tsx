import type React from "react";
import {
	PrescriptionPrintModal,
	type PrescriptionPrintModalProps,
	type PrescriptionFormType,
} from "../prescriptions/PrescriptionPrintModal";

export type PrescriptionModalProps = PrescriptionPrintModalProps;

/**
 * PrescriptionModal — обертка для вызова модального окна рецептов из карты визита/ЭМК.
 * Пробрасывает аллергии пациента (`patient.allergies` / `patient.anamnesis.allergies`) в `PrescriptionPrintModal`,
 * гарантируя преклинический скрининг аллергических рисков (Мандат 8i)
 * при безусловном соблюдении автономии врача (Мандат 8e: печать никогда не блокируется).
 */
export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
	patient,
	allergies,
	...rest
}) => {
	const resolvedAllergies =
		allergies ??
		patient?.allergies ??
		(patient as any)?.anamnesis?.allergies ??
		(patient as any)?.raw?.allergies;

	const resolvedPatient = patient
		? {
				...patient,
				allergies: resolvedAllergies,
			}
		: null;

	return (
		<PrescriptionPrintModal
			{...rest}
			patient={resolvedPatient}
			allergies={resolvedAllergies}
		/>
	);
};

export { type PrescriptionFormType };

