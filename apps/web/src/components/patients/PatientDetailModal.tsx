import React from "react";
import { PatientCardModal, type PatientCardModalProps } from "./PatientCardModal";

export type PatientDetailModalProps = PatientCardModalProps;

/**
 * PatientDetailModal — Канонический алиас для комплексной карты пациента PatientCardModal.
 * Обеспечивает 100% обратную совместимость и строгую эргономику (Мандат 8e).
 */
export const PatientDetailModal: React.FC<PatientDetailModalProps> = React.memo(
	function PatientDetailModal(props) {
		return <PatientCardModal {...props} />;
	},
);

export default PatientDetailModal;
