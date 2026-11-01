/**
 * DENTE Dental CRM — Doctor Payroll Modal Content Proxy Facade
 * Compliance: Mandate 8b (Sweet Spot <= 60 lines), Mandate 8aq (SSOT Architecture).
 */

import React from "react";
import {
	DoctorPayrollStudioModal,
	type DoctorPayrollStudioModalProps,
} from "./DoctorPayrollStudioModal";

export type DoctorPayrollModalContentProps = DoctorPayrollStudioModalProps;

export const DoctorPayrollModalContent: React.FC<DoctorPayrollModalContentProps> = (props) => {
	return <DoctorPayrollStudioModal {...props} />;
};

export default DoctorPayrollModalContent;
