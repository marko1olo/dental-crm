/**
 * PatientStudioModal.tsx — Канонический тонкий фасад к PatientCardModal (SSOT).
 * Реализует единый неделимый мастер-компонент картотеки пациентов по Мандатам 8b, 8e, 8n, 8am.
 */

import React from "react";
import { PatientCardModal } from "./PatientCardModal";
import type { PatientCardModalProps } from "./patientCardModalModules/patientCardModalTypes";

export type PatientStudioTab = "express" | "profile" | "family" | "history";

export type PatientStudioModalProps = PatientCardModalProps;

export const PatientStudioModal: React.FC<PatientCardModalProps> = React.memo(
	function PatientStudioModal(props) {
		return <PatientCardModal {...props} />;
	},
);

export default PatientStudioModal;
