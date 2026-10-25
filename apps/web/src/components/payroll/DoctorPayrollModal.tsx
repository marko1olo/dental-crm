import React from "react";
import { createPortal } from "react-dom";
import {
	type DoctorCompletedServiceItem,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	type SoloDoctorSpecialtyPreset,
	DEFAULT_SOLO_DOCTOR,
} from "./staffPayrollEngine";
import { getDefaultPayrollPeriod } from "./doctorPayrollModalUtils";
import { useDoctorPayrollModalState } from "./useDoctorPayrollModalState";
import { useDoctorPayrollModalActions } from "./useDoctorPayrollModalActions";
import { DoctorPayrollModalContent } from "./DoctorPayrollModalContent";
import { useDocumentBrandingStore } from "../../store/documentBrandingStore";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import "./doctorPayroll.css";

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
}

export const DoctorPayrollModal: React.FC<DoctorPayrollModalProps> = ({
	isOpen,
	onClose,
	clinicName,
	doctorsList = [],
	initialDoctorId,
	initialServices,
	initialPeriodStart,
	initialPeriodEnd,
	initialBasePercentage,
	useClinicalCategoryRates,
}) => {
	const branding = useDocumentBrandingStore();
	const appLogic = useOptionalAppLogicContext();
	const resolvedClinicName = (clinicName && clinicName.trim())
		|| branding?.clinicName
		|| branding?.clinicLegalName
		|| appLogic?.dashboard?.organization?.name
		|| appLogic?.dashboard?.clinicSettings?.clinicName
		|| "";

	const state = useDoctorPayrollModalState({
		isOpen, clinicName: resolvedClinicName, doctorsList, initialDoctorId, initialServices,
		initialPeriodStart, initialPeriodEnd, initialBasePercentage, useClinicalCategoryRates,
	});

	const { handleSendToMessenger, handleDownloadCsv, handleExport1C, handlePrintPayslip } = useDoctorPayrollModalActions({
		payrollResult: state.payrollResult,
		servicesToUse: state.servicesToUse,
		periodStart: state.periodStart,
		periodEnd: state.periodEnd,
		soloSpecialtyId: state.soloSpecialtyId,
		resolvedClinicName,
		setCopyFeedback: state.setCopyFeedback,
	});

	if (!isOpen) return null;

	const modal = (
		<DoctorPayrollModalContent
			clinicName={resolvedClinicName}
			doctorsList={doctorsList}
			onClose={onClose}
			state={state}
			onSendToMessenger={handleSendToMessenger}
			onDownloadCsv={handleDownloadCsv}
			onExport1C={handleExport1C}
			onPrintPayslip={handlePrintPayslip}
		/>
	);

	return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
};

export default DoctorPayrollModal;
