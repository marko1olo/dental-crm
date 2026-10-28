import {
	generateDoctorPayrollCsv,
	generateDoctorPayslipHtml,
	generateDoctorPayslipMessengerText,
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

	const handlePrintPayslip = () => {
		const printWindow = window.open("", "_blank", "width=800,height=900");
		const html = generateDoctorPayslipHtml(payrollResult, resolvedClinicName, servicesToUse);
		if (!printWindow) { window.print(); return; }
		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
	};

	return { handleSendToMessenger, handleDownloadCsv, handlePrintPayslip };
}
