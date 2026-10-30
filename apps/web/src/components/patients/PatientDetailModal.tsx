/**
 * PatientDetailModal.tsx — Канонический консолидированный фасад к SSOT карточки пациента (Мандаты 8b, 8e).
 * Консолидирован с PatientDetailsModal для устранения параллельных дублирующих модалок.
 */

import React from "react";
import { PatientDetailsModal, type PatientDetailsModalProps } from "./PatientDetailsModal";
import { PatientCardModal, type PatientCardModalProps } from "./PatientCardModal";
import { PatientWorkspaceView, type PatientWorkspaceViewProps } from "./PatientWorkspaceView";

export type PatientDetailModalProps = PatientCardModalProps;

export const PatientDetailModal: React.FC<PatientDetailModalProps> = React.memo((props) => (
	<PatientDetailsModal {...(props as PatientDetailsModalProps)} />
));

export { PatientWorkspaceView, PatientWorkspaceView as PatientWorkspace, type PatientWorkspaceViewProps };
export default PatientDetailModal;
