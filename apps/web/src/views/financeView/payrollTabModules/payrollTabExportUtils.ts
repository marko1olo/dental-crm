import { generateDoctorPayrollCsv, type DoctorPayrollResult } from "@dental/shared/payroll";
import { generateDoctorPayslipHtml } from "../../../components/payroll/staffPayrollEngine";

export function exportDoctorPayrollCsv(calculationResult: DoctorPayrollResult, doctorName: string, periodStart: string, periodEnd: string): void {
	const csv = generateDoctorPayrollCsv([calculationResult]);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.setAttribute("download", `Расчетный_лист_${doctorName}_${periodStart}_${periodEnd}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export function printDoctorPayslipHtml(calculationResult: DoctorPayrollResult, clinicName: string): void {
	const html = generateDoctorPayslipHtml(calculationResult, clinicName);
	const win = window.open("", "_blank");
	if (win) {
		win.document.write(html);
		win.document.close();
		win.focus();
		win.print();
	}
}
