import React from "react";
import {
	DoctorMobileShiftModal,
	type DoctorMobileShiftModalProps,
} from "./DoctorMobileShiftModal";

export type DoctorMobileShiftAutonomyProps = DoctorMobileShiftModalProps;

/**
 * DoctorMobileShiftAutonomy
 * Apple HIG-compliant touch interface for autonomous doctor shifts on smartphones (390x844).
 * Mandate 8e: Non-blocking clinical reception, 1-click status transitions, PEP signing.
 */
export const DoctorMobileShiftAutonomy: React.FC<DoctorMobileShiftAutonomyProps> = (props) => {
	return <DoctorMobileShiftModal {...props} />;
};

export default DoctorMobileShiftAutonomy;
