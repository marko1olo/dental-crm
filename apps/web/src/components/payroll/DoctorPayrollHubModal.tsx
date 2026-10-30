/**
 * DoctorPayrollHubModal.tsx — Facade & Canonical Re-export for DoctorPayrollStudioModal
 * Mandate 8b (Sweet Spot), Mandate 8aq (SSOT Architecture & Immediate Legacy Eviction).
 */

import React from "react";
import {
	DoctorPayrollStudioModal,
	type DoctorPayrollStudioModalProps,
} from "./DoctorPayrollStudioModal";

export type DoctorPayrollHubModalProps = DoctorPayrollStudioModalProps;

export const DoctorPayrollHubModal: React.FC<DoctorPayrollHubModalProps> = (props) => {
	return <DoctorPayrollStudioModal {...props} />;
};

export default DoctorPayrollHubModal;
