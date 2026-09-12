/**
 * ============================================================================
 * STAFF PAYROLL LEDGER MODAL (CANONICAL CONSOLIDATED DELEGATE)
 * Canonical delegate to DoctorPayrollModal (Mandates 8e & 8n).
 * Consolidates multi-tab staff ledger into unified transparent payroll.
 * ============================================================================
 */

import React from "react";
import {
	DoctorPayrollModal,
	type DoctorPayrollModalProps,
} from "./DoctorPayrollModal";

export interface StaffPayrollLedgerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly initialPeriodStart?: string | undefined;
	readonly initialPeriodEnd?: string | undefined;
	readonly initialDoctors?: readonly any[] | undefined;
	readonly initialAssistants?: readonly any[] | undefined;
	readonly initialAdministrators?: readonly any[] | undefined;
}

export const StaffPayrollLedgerModal: React.FC<StaffPayrollLedgerModalProps> = ({
	isOpen,
	onClose,
	clinicName,
	initialDoctors,
	initialPeriodStart,
	initialPeriodEnd,
}) => {
	if (!isOpen) return null;

	const adaptedDoctors = (initialDoctors || []).map((doc: any) => ({
		id: doc.id || doc.employeeId || "solo-doctor",
		name: doc.name || doc.employeeFullName || "Сотрудник клиники",
		specialtyId: doc.specialtyId || "general_dentist",
	}));

	return (
		<DoctorPayrollModal
			isOpen={isOpen}
			onClose={onClose}
			clinicName={clinicName}
			doctorsList={adaptedDoctors.length > 0 ? adaptedDoctors : undefined}
			initialPeriodStart={initialPeriodStart}
			initialPeriodEnd={initialPeriodEnd}
		/>
	);
};

export default StaffPayrollLedgerModal;
