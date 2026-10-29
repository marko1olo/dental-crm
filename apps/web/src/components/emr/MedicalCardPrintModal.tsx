/**
 * apps/web/src/components/emr/MedicalCardPrintModal.tsx
 *
 * Каноническая модалка просмотра и печати медицинской карты пациента (Мандат 8ap, 8x).
 * Единый доменный язык DENTE без бюрократических номеров приказов.
 */

import React from "react";
import {
	MedicalRecordPrintModal,
	type MedicalRecordPrintModalProps,
} from "./record/MedicalRecordPrintModal";

export type MedicalCardPrintModalProps = MedicalRecordPrintModalProps;

export const MedicalCardPrintModal: React.FC<MedicalCardPrintModalProps> = MedicalRecordPrintModal;

export {
	MedicalRecordPrintModal,
	MedicalRecordPrintModal as ClinicalDiaryPrintModal,
	MedicalRecordPrintModal as Form043PrintModal,
};

export default MedicalCardPrintModal;
