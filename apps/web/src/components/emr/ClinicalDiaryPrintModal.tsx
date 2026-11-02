/**
 * apps/web/src/components/emr/ClinicalDiaryPrintModal.tsx
 *
 * Фасад совместимости клинического дневника приёма (Мандаты 8e, 8ap, 8x).
 * Перенаправляет на канонический SSOT: MedicalRecordStudioModal.
 */

import React from "react";
import {
	MedicalRecordStudioModal,
	type MedicalRecordStudioModalProps,
} from "./MedicalRecordStudioModal";

export type ClinicalDiaryPrintModalProps = MedicalRecordStudioModalProps;
export type Form043PrintModalProps = MedicalRecordStudioModalProps;

export const ClinicalDiaryPrintModal: React.FC<ClinicalDiaryPrintModalProps> = MedicalRecordStudioModal;

export default ClinicalDiaryPrintModal;
