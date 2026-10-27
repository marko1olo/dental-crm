/**
 * packages/shared/src/finance/doctorPayrollEngine.ts
 * Canonical Doctor & Staff Piece-Rate Payroll & Payout Engine Facade.
 * Mandate 8b: pure facade <= 15 lines.
 */

export * from "./payrollModules/payrollRegistry.js";
export { isGeneralClinicOverheadConsumable } from "./doctorNetSalaryEngine.js";
