/**
 * DENTE Dental CRM — Multi-Role Staff Payroll Statutory & 1C:ZUP 3.1 Exports
 * Compact Canonical Facade (Mandate 8b: File strictly <= 120 lines).
 */

export { escapeXml } from "./exports/escapeXml";
export {
	generateStaffPayrollT51Csv,
	generatePayrollT51Csv,
} from "./exports/t51CsvExporter";
export { generate1CZup31Xml } from "./exports/zup31XmlExporter";
export { generate1CZup31Csv } from "./exports/zup31CsvExporter";
export { generateFormT51Html } from "./exports/formT51HtmlExporter";
export { generateDoctorPayslipHtml } from "./exports/doctorPayslipHtmlExporter";
export { generateDoctorPayslipMessengerText } from "./exports/doctorPayslipMessengerExporter";

import { generatePayrollT51Csv } from "./exports/t51CsvExporter";
export const generateDoctorPayrollCsv = generatePayrollT51Csv;
