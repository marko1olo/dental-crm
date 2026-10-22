/**
 * t51CsvExporter.ts — Deprecated shim re-exporting canonical domain exporter.
 * Compliance: Mandate 8x & 8ap. Canonical implementation: ./payrollCsvExporter.ts
 */

export {
	generateDoctorPayrollCsv,
	generateStaffPayrollCsv,
	generatePayrollT51Csv,
	generateStaffPayrollT51Csv,
} from "./payrollCsvExporter";
