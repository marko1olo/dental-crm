import React from "react";
import { PatientCardModal, type PatientCardModalProps } from "./PatientCardModal";
import { PatientWorkspaceView, type PatientWorkspaceViewProps } from "./PatientWorkspaceView";

export type PatientDetailModalProps = PatientCardModalProps;

/**
 * PatientDetailModal — Канонический модальный алиас для комплексной карты пациента PatientCardModal.
 * Для полноценной рабочей области пациента используйте канонический PatientWorkspace / PatientWorkspaceView.
 * Обеспечивает 100% обратную совместимость и строгую эргономику (Мандат 8e, 8za).
 */
export const PatientDetailModal: React.FC<PatientDetailModalProps> = React.memo(
	function PatientDetailModal(props) {
		return <PatientCardModal {...props} />;
	},
);

export { PatientWorkspaceView, PatientWorkspaceView as PatientWorkspace, type PatientWorkspaceViewProps };
export default PatientDetailModal;
