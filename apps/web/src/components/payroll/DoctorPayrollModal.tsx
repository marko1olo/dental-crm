import React from "react";
import { createPortal } from "react-dom";
import {
	generateDoctorPayrollCsv,
	generateDoctorPayslipHtml,
	generateDoctorPayslipMessengerText,
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollXml,
	type DoctorCompletedServiceItem,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	type SoloDoctorSpecialtyPreset,
	DEFAULT_SOLO_DOCTOR,
} from "./staffPayrollEngine";
import { getDefaultPayrollPeriod } from "./doctorPayrollModalUtils";
import { useDoctorPayrollModalState } from "./useDoctorPayrollModalState";
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

	if (!isOpen) return null;

	const handleSendToMessenger = (platform: "clipboard" | "whatsapp" | "telegram" = "clipboard") => {
		const text = generateDoctorPayslipMessengerText(state.payrollResult, resolvedClinicName);
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text);
			state.setCopyFeedback("Текст листка скопирован!");
			setTimeout(() => state.setCopyFeedback(null), 3000);
		}
		if (typeof window !== "undefined") {
			if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
			else if (platform === "telegram") window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}`, "_blank");
		}
	};

	const handleDownloadCsv = () => {
		const csv = generateDoctorPayrollCsv([state.payrollResult]);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `расчетная_ведомость_${state.payrollResult.doctorId || "report"}_${state.periodStart}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExport1C = () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: resolvedClinicName,
			periodStartIso: state.periodStart,
			periodEndIso: state.periodEnd,
			doctors: [
				{
					employeeId: state.payrollResult.doctorId || "doc-1",
					employeeTabNumber: "00101",
					employeeFullName: state.payrollResult.doctorName,
					specialtyId: (state.soloSpecialtyId as any) || "therapist",
					periodStartIso: state.periodStart,
					periodEndIso: state.periodEnd,
					services: state.servicesToUse.map((s) => ({
						id: s.id,
						dateIso: s.dateIso,
						patientName: s.patientName,
						medicalCardNumber: s.medicalCardNumber,
						serviceNameRu: s.serviceNameRu,
						category: s.category,
						grossRevenueKop: s.grossRevenueKop,
						labCostKop: s.labCostKop,
						materialCostKop: s.materialCostKop,
					})),
				},
			],
		});
		const xml = generateStaffPayrollXml(summary, `ЗП-${state.payrollResult.doctorId || "DOC"}`, state.periodEnd);
		const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `выгрузка_1с_зарплата_${state.payrollResult.doctorId || "report"}_${state.periodStart}.xml`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handlePrintPayslip = () => {
		const printWindow = window.open("", "_blank", "width=800,height=900");
		const html = generateDoctorPayslipHtml(state.payrollResult, resolvedClinicName, state.servicesToUse);
		if (!printWindow) { window.print(); return; }
		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
	};

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
