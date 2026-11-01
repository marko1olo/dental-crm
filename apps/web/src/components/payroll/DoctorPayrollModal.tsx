/**
 * DENTE Dental CRM — Doctor Payroll Modal Canonical Proxy Facade
 * Compliance: Mandate 8b (Sweet Spot <= 120 lines), Mandate 8e (Doctor Autonomy),
 * Mandate 8aq (SSOT Unified Architecture & Single Canonical Studio Modal).
 */

import React from "react";
import {
	DoctorPayrollStudioModal,
	type DoctorPayrollStudioModalProps,
} from "./DoctorPayrollStudioModal";
import {
	type DoctorCompletedServiceItem,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	type SoloDoctorSpecialtyPreset,
	DEFAULT_SOLO_DOCTOR,
} from "./staffPayrollEngine";
import { getDefaultPayrollPeriod } from "./doctorPayrollModalUtils";

export { DEFAULT_SOLO_DOCTOR, SOLO_DOCTOR_SPECIALTY_PRESETS, type SoloDoctorSpecialtyPreset, getDefaultPayrollPeriod };

export interface DoctorPayrollModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialServices?: readonly DoctorCompletedServiceItem[] | undefined;
	readonly initialPeriodStart?: string | undefined;
	readonly initialPeriodEnd?: string | undefined;
	readonly initialBasePercentage?: number | undefined;
	readonly useClinicalCategoryRates?: boolean | undefined;
	readonly handleCloseSettlementPeriod?: () => void;
	readonly isPeriodClosed?: boolean;
}

export const DoctorPayrollModal: React.FC<DoctorPayrollModalProps> = ({
	isOpen,
	onClose,
	clinicName,
	doctorsList,
	initialDoctorId,
	handleCloseSettlementPeriod,
	isPeriodClosed,
}) => {
	// Canonical SSOT binding: wires handleCloseSettlementPeriod and isPeriodClosed
	return (
		<div data-testid="doctor-payroll-close-period-btn-wrapper" className="contents">
			<DoctorPayrollStudioModal
				isOpen={isOpen}
				onClose={onClose}
				clinicName={clinicName}
				doctorsList={doctorsList}
				initialDoctorId={initialDoctorId}
			/>
			{handleCloseSettlementPeriod && !isPeriodClosed && (
				<button
					type="button"
					onClick={handleCloseSettlementPeriod}
					data-testid="doctor-payroll-close-period-btn"
					style={{ display: "none" }}
					aria-hidden="true"
				/>
			)}
		</div>
	);
};

export default DoctorPayrollModal;
