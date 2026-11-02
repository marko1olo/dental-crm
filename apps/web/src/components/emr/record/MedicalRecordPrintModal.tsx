/**
 * apps/web/src/components/emr/record/MedicalRecordPrintModal.tsx
 *
 * Канонический реэкспорт MedicalRecordStudioModal (SSOT Волна 32.1).
 */

import React from "react";
import {
	MedicalRecordStudioModal,
	type MedicalRecordStudioModalProps,
} from "../MedicalRecordStudioModal";

export type MedicalRecordPrintModalProps = MedicalRecordStudioModalProps;
export type Form043PrintModalProps = MedicalRecordStudioModalProps;

export const MedicalRecordPrintModal: React.FC<MedicalRecordPrintModalProps> = MedicalRecordStudioModal;
export const Form043PrintModal: React.FC<Form043PrintModalProps> = MedicalRecordStudioModal;

export default MedicalRecordStudioModal;
