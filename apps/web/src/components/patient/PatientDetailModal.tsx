import React from "react";
import {
	PatientAnamnesisModal,
	type PatientAnamnesisModalProps,
} from "./PatientAnamnesisModal";
import type { PatientClinicalSafetyProfile } from "./safetyMath";

export interface PatientDetailModalProps extends PatientAnamnesisModalProps {
	readonly patientPhone?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly gender?: string | null | undefined;
	readonly email?: string | null | undefined;
}

/**
 * PatientDetailModal — детальное модальное окно пациента и клинической анкеты соматического здоровья.
 *
 * МАНДАТЫ 8e, 8k, 8n:
 * Соматический анамнез имеет 1-клик кнопку «Соматически здоров / норма» (data-testid="btn-somatic-healthy-norm"),
 * исключая необходимость ручного прокликивания 50 больничных пунктов соматики.
 */
export const PatientDetailModal: React.FC<PatientDetailModalProps> = React.memo((props) => {
	return <PatientAnamnesisModal {...props} />;
});

PatientDetailModal.displayName = "PatientDetailModal";

export default PatientDetailModal;
export { PatientAnamnesisModal };
export type { PatientClinicalSafetyProfile };
