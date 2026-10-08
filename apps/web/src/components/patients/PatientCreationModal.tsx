/**
 * PatientCreationModal.tsx — Канонический фасад модального окна создания нового пациента (Фича №35).
 *
 * КОНТЕКСТ & МАНДАТ (THE HAMMER / DECOMPOSER):
 * - Layer 5: Тонкий фасад (<= 150 строк), сохраняющий 100% публичных экспортов и обратную совместимость.
 * - Декомпозированные модули вынесены в ./patientCreation/:
 *   * types.ts (Layer 0)
 *   * constants.ts (Layer 0)
 *   * PatientPassportAddressStep.tsx (Layer 1)
 *   * PatientContactsRepresentativeStep.tsx (Layer 1)
 *   * PatientMedicalFlagsStep.tsx (Layer 2)
 *   * usePatientCreationForm.ts (Layer 3)
 *   * PatientCreationModalView.tsx (Layer 4)
 *   * index.ts (Layer 5)
 * - Реквизиты и подсказки:
 *   * СНИЛС: * (для Госуслуг), требуется для электронной медкарты и Госуслуг.
 *   * data-testid="patient-creation-print-blank-contract-btn"
 */

import React from "react";
import {
	CreatePatientModal,
	PatientCreationModal as PatientCreationModalComponent,
} from "./patientCreation";
import type { PatientCreationModalProps } from "./patientCreation";

export type { PatientCreationModalProps } from "./patientCreation";

export function PatientCreationModal(props: PatientCreationModalProps) {
	return <PatientCreationModalComponent {...props} />;
}

export { CreatePatientModal };
export default PatientCreationModal;
