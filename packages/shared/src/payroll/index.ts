/**
 * @dental/shared/payroll — Advanced Doctor Piece-Rate Payroll, Assistant KPI & Form T-13 Timesheet Engine (Wave 14)
 *
 * Core Capabilities:
 * - Kopeck-exact integer arithmetic (zero floating-point drift).
 * - Differentiated doctor piece-rate commissions by medical specialty (Therapy, Orthopedics, Surgery, Orthodontics, Hygiene, Retail).
 * - Dynamic lab (ЗТЛ) and direct material cost deductions BEFORE applying doctor percentage.
 * - Assistant shift rates + CBCT/OPTG diagnostic imaging percentage and surgical bonuses.
 * - 1C:ZUP 3.1 statutory gross accruals export in XML (EnterpriseData) and CSV formats.
 * - Statutory Form T-13 timesheet calculation and A4 landscape printable HTML / CSV export.
 */

export * from "./advancedDoctorPayrollEngine.js";
export * from "./formT13TimesheetEngine.js";
