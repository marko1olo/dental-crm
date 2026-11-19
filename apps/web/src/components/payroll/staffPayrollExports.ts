/**
 * DENTE Dental CRM — Multi-Role Staff Payroll & Payout Exports Facade
 * Compact Canonical Facade (Mandate 8b: File strictly <= 120 lines).
 * Compliance: Mandate 8x & 8ap (Clean Russian Clinical Terminology without Bureaucratic Codes).
 */

export {
	generateDoctorPayrollCsv,
	generateStaffPayrollCsv,
	generateStaffPayrollLedgerCsv,
} from "./exports/payrollCsvExporter";
export {
	generateStaffPayrollAccountingCsv,
	generate1CZup31Csv,
} from "./exports/staffPayrollAccountingCsvExporter";
export {
	generateStaffPayrollLedgerHtml,
} from "./exports/staffPayrollLedgerHtmlExporter";
export { generateDoctorPayslipHtml } from "./exports/doctorPayslipHtmlExporter";
export { generateDoctorPayslipMessengerText } from "./exports/doctorPayslipMessengerExporter";
