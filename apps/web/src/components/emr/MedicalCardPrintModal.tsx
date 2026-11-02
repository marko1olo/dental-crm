/**
 * apps/web/src/components/emr/MedicalCardPrintModal.tsx
 *
 * Канонический фасад просмотра и печати медицинской карты приёма DENTE CRM (Мандаты 8e, 8ap, 8x).
 * Единый доменный язык без бюрократических номеров приказов.
 * Перенаправляет на канонический SSOT: MedicalRecordStudioModal.
 */

import React from "react";
import {
	MedicalRecordStudioModal,
	type MedicalRecordStudioModalProps,
} from "./MedicalRecordStudioModal";

export type MedicalCardPrintModalProps = MedicalRecordStudioModalProps;
export type MedicalRecordPrintModalProps = MedicalRecordStudioModalProps;

export const MedicalCardPrintModal: React.FC<MedicalCardPrintModalProps> = MedicalRecordStudioModal;
export const MedicalRecordPrintModal: React.FC<MedicalRecordPrintModalProps> = MedicalRecordStudioModal;
export const ClinicalDiaryPrintModal: React.FC<MedicalRecordStudioModalProps> = MedicalRecordStudioModal;

export {
	MedicalRecordStudioModal,
};

export default MedicalCardPrintModal;
