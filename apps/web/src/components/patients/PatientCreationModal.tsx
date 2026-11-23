/**
 * PatientCreationModal.tsx — Прозрачный канонический фасад к единому мастер-компоненту PatientCardModal (Мандат 8b, 8n).
 * Консолидирует создание нового пациента в едином окне карты пациента (mode="create").
 *
 * КОНТЕКСТ & МАНДАТ:
 * - Реквизиты и подсказки:
 *   * СНИЛС: * (для Госуслуг), требуется для электронной медкарты и Госуслуг.
 *   * data-testid="patient-creation-print-blank-contract-btn"
 */

import React from "react";
import { PatientCardModal } from "./PatientCardModal";
import type { PatientCreationModalProps } from "./patientCreation";

export type { PatientCreationModalProps } from "./patientCreation";

export function PatientCreationModal(props: PatientCreationModalProps) {
	const [dynamicKey] = React.useState(
		() => `patient-creation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
	);
	return <PatientCardModal key={dynamicKey} {...props} mode="create" />;
}

export const CreatePatientModal = PatientCreationModal;
export default PatientCreationModal;
