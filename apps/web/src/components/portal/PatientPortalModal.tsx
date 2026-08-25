/**
 * Patient Portal & Mobile Cabinet Modal (375px PWA)
 * (DOMAIN: PORTAL PATIENT CABINET & RECEPTION QR CHECK-IN)
 */

import type React from "react";
import { PatientCabinetModal, type PatientCabinetModalProps } from "./patientCabinet/PatientCabinetModal";
export { PatientCabinetModal } from "./patientCabinet/PatientCabinetModal";
export {
	generateReceptionCheckinQrPayload,
	type ReceptionCheckinQrResult,
} from "./patientCabinet/patientCabinetEngine";

export interface PatientPortalModalProps extends PatientCabinetModalProps {}

/**
 * Canonical Patient Portal Modal component with 375px mobile reception QR check-in support.
 */
export const PatientPortalModal: React.FC<PatientPortalModalProps> = (props) => {
	return <PatientCabinetModal {...props} />;
};

export default PatientPortalModal;
