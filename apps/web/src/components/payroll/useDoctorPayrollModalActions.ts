import {
	generateDoctorPayrollCsv,
	generateDoctorPayslipHtml,
	generateDoctorPayslipMessengerText,
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollXml,
	type DoctorCompletedServiceItem,
	type DoctorPayrollResult,
} from "./staffPayrollEngine";

export interface UseDoctorPayrollModalActionsParams {
	readonly payrollResult: DoctorPayrollResult;
	readonly servicesToUse: readonly DoctorCompletedServiceItem[];
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly soloSpecialtyId?: string | undefined;
	readonly resolvedClinicName: string;
	readonly setCopyFeedback: (msg: string | null) => void;
}

export function useDoctorPayrollModalActions({
	payrollResult,
	servicesToUse,
	periodStart,
	periodEnd,
	soloSpecialtyId,
	resolvedClinicName,
	setCopyFeedback,
}: UseDoctorPayrollModalActionsParams) {
	const handleSendToMessenger = (platform: "clipboard" | "whatsapp" | "telegram" = "clipboard") => {
		const text = generateDoctorPayslipMessengerText(payrollResult, resolvedClinicName);
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text);
			setCopyFeedback("Текст листка скопирован!");
			setTimeout(() => setCopyFeedback(null), 3000);
		}
		if (typeof window !== "undefined") {
			if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
			else if (platform === "telegram") window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}`, "_blank");
		}
	};

	const handleDownloadCsv = () => {
		const csv = generateDoctorPayrollCsv([payrollResult]);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `расчетная_ведомость_${payrollResult.doctorId || "report"}_${periodStart}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExport1C = () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: resolvedClinicName,
			periodStartIso: periodStart,
			periodEndIso: periodEnd,
			doctors: [{
				employeeId: payrollResult.doctorId || "doc-1",
				employeeTabNumber: "00101",
				employeeFullName: payrollResult.doctorName,
				specialtyId: (soloSpecialtyId as any) || "therapist",
				periodStartIso: periodStart,
				periodEndIso: periodEnd,
				services: servicesToUse.map((s) => ({
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
			}],
		});
		const xml = generateStaffPayrollXml(summary, `ЗП-${payrollResult.doctorId || "DOC"}`, periodEnd);
		const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `выгрузка_1с_зарплата_${payrollResult.doctorId || "report"}_${periodStart}.xml`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handlePrintPayslip = () => {
		const printWindow = window.open("", "_blank", "width=800,height=900");
		const html = generateDoctorPayslipHtml(payrollResult, resolvedClinicName, servicesToUse);
		if (!printWindow) { window.print(); return; }
		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
	};

	return { handleSendToMessenger, handleDownloadCsv, handleExport1C, handlePrintPayslip };
}
