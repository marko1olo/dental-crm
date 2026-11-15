/**
 * @dental/shared/payroll — Advanced Doctor Piece-Rate Payroll & Assistant Remuneration Engine
 *
 * Core Capabilities:
 * - Kopeck-exact integer arithmetic (zero floating-point drift).
 * - Differentiated doctor piece-rate commissions by medical specialty (Therapy, Orthopedics, Surgery, Orthodontics, Hygiene, Retail).
 * - Dynamic lab (ЗТЛ) and direct material cost deductions BEFORE applying doctor percentage (Net Revenue).
 * - Assistant shift rates + CBCT/OPTG diagnostic imaging percentage and surgical bonuses.
 * - 1C:ZUP 3.1 statutory gross accruals export in XML (EnterpriseData) and CSV formats.
 */

export * from "../finance/doctorPayrollEngine.js";
export * from "../finance/doctorNetSalaryEngine.js";
