/**
 * PatientDetailsModal.tsx — Канонический фасад к единому мастер-компоненту PatientCardModal (Мандат 8b).
 * Обеспечивает обратную совместимость для всех внешних лаунчеров и тестов.
 */

import React from "react";
import { PatientCardModal } from "./PatientCardModal";
import type { PatientDetailsModalProps } from "./detailsModal/patientDetailsTypes";

export * from "./detailsModal/patientDetailsTypes";

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = React.memo(
	function PatientDetailsModal(props) {
		return <PatientCardModal {...props} />;
	},
);

export default PatientDetailsModal;
