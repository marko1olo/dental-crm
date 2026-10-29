/** PatientDetailModal.tsx — Канонический фасад к SSOT PatientCardModal (Мандат 8b, 8e). */
import React from "react";
import { PatientCardModal, type PatientCardModalProps } from "./PatientCardModal";
import { PatientWorkspaceView, type PatientWorkspaceViewProps } from "./PatientWorkspaceView";
export type PatientDetailModalProps = PatientCardModalProps;
export const PatientDetailModal: React.FC<PatientDetailModalProps> = React.memo((p) => <PatientCardModal {...p} />);
export { PatientWorkspaceView, PatientWorkspaceView as PatientWorkspace, type PatientWorkspaceViewProps };
export default PatientDetailModal;
