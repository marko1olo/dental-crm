/**
 * ============================================================================
 * FORM T-13 TIMESHEET MODAL (CANONICAL CONSOLIDATED DELEGATE)
 * Canonical delegate to TimesheetT13Modal.
 * Eliminates 1100+ lines of duplicated code (Mandate 8j).
 * ============================================================================
 */

import React from "react";
import {
	TimesheetT13Modal,
	type TimesheetT13ModalProps,
	type EmployeeInfo,
} from "./TimesheetT13Modal";

export type FormT13EmployeeInfo = EmployeeInfo;

export interface FormT13TimesheetModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly organizationOkpo?: string | undefined;
	readonly initialYear?: number | undefined;
	readonly initialMonth?: number | undefined;
	readonly employeesList?: readonly FormT13EmployeeInfo[] | undefined;
}

export type TimesheetViewMode = "interactive" | "allEmployees" | "printA4";

export const FormT13TimesheetModal: React.FC<FormT13TimesheetModalProps> = ({
	isOpen,
	onClose,
	clinicName,
	employeesList,
}) => {
	if (!isOpen) return null;

	return (
		<TimesheetT13Modal
			isOpen={isOpen}
			onClose={onClose}
			clinicName={clinicName}
			employees={employeesList}
		/>
	);
};

export { TimesheetT13Modal };
export default FormT13TimesheetModal;
