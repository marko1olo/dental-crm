/**
 * DENTE Dental CRM — Multi-Role Staff Payroll & Payout Exports Facade
 * Compact Canonical Facade (Mandate 8b: File strictly <= 120 lines).
 * Compliance: Mandate 8x & 8ap (Clean Russian Clinical Terminology without Bureaucratic Codes).
 */

export { escapeXml } from "./exports/escapeXml";
export {
	generateDoctorPayrollCsv,
	generateStaffPayrollCsv,
	generateStaffPayrollT51Csv,
	generatePayrollT51Csv,
} from "./exports/payrollCsvExporter";
export {
	generateStaffPayrollXml,
	generate1CZup31Xml,
} from "./exports/staffPayrollXmlExporter";
export {
	generateStaffPayrollAccountingCsv,
	generate1CZup31Csv,
} from "./exports/staffPayrollAccountingCsvExporter";
export {
	generateStaffPayrollLedgerHtml,
	generateFormT51Html,
} from "./exports/staffPayrollLedgerHtmlExporter";
export { generateDoctorPayslipHtml } from "./exports/doctorPayslipHtmlExporter";
export { generateDoctorPayslipMessengerText } from "./exports/doctorPayslipMessengerExporter";
