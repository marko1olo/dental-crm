/** PatientDetailsModal.tsx — Канонический фасад к единому мастер-компоненту PatientCardModal (Мандат 8b). */
import React from "react";
import { PatientCardModal } from "./PatientCardModal";
import type { PatientDetailsModalProps } from "./detailsModal/patientDetailsTypes";
export * from "./detailsModal/patientDetailsTypes";
export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = React.memo((p) => <PatientCardModal {...p} />);
export default PatientDetailsModal;
