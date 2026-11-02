/**
 * apps/web/src/components/emr/Form043PrintModal.tsx
 *
 * Фасад совместимости формы медицинской карты (Мандаты 8e, 8ap, 8x).
 * Перенаправляет на канонический SSOT: MedicalRecordStudioModal.
 */

import React from "react";
import {
	MedicalRecordStudioModal,
	type MedicalRecordStudioModalProps,
} from "./MedicalRecordStudioModal";

export type Form043PrintModalProps = MedicalRecordStudioModalProps;

export const Form043PrintModal: React.FC<Form043PrintModalProps> = MedicalRecordStudioModal;

export default Form043PrintModal;
