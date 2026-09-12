/**
 * ============================================================================
 * ADVANCED DOCTOR PAYROLL MODAL (CANONICAL CONSOLIDATED DELEGATE)
 * Canonical delegate to DoctorPayrollModal (Mandates 8e & 8n).
 * Eliminates 1100+ lines of redundant Soviet bureaucracy in favor of
 * direct Net-Revenue payroll for solo doctor & 1-3 chairs.
 * ============================================================================
 */

import React from "react";
import {
	DoctorPayrollModal,
	type DoctorPayrollModalProps,
} from "./DoctorPayrollModal";

export interface AdvancedDoctorPayrollModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly doctorsList?: readonly any[] | undefined;
	readonly assistantsList?: readonly any[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialPeriodStart?: string | undefined;
	readonly initialPeriodEnd?: string | undefined;
}

export type PayrollTabKey = "directions" | "services" | "assistants" | "kpi" | "export1c" | "slip";

export interface ClinicalDirectionSummary {
	readonly categoryKey: string;
	readonly titleRu: string;
	readonly count: number;
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly netBaseKop: number;
	readonly commissionPercent: number;
	readonly earnedAccrualKop: number;
}

export const AdvancedDoctorPayrollModal: React.FC<AdvancedDoctorPayrollModalProps> = ({
	isOpen,
	onClose,
	clinicName,
	doctorsList,
	initialDoctorId,
	initialPeriodStart,
	initialPeriodEnd,
}) => {
	if (!isOpen) return null;

	const adaptedDoctors = (doctorsList || []).map((doc: any) => ({
		id: doc.id || doc.employeeId || "solo-doctor",
		name: doc.name || doc.employeeFullName || "Врач-стоматолог",
		specialtyId: doc.specialtyId || "general_dentist",
	}));

	return (
		<DoctorPayrollModal
			isOpen={isOpen}
			onClose={onClose}
			clinicName={clinicName}
			doctorsList={adaptedDoctors.length > 0 ? adaptedDoctors : undefined}
			initialDoctorId={initialDoctorId}
			initialPeriodStart={initialPeriodStart}
			initialPeriodEnd={initialPeriodEnd}
		/>
	);
};

export default AdvancedDoctorPayrollModal;
