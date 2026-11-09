/**
 * doctorNetSalaryEngine.ts — Clinical Doctor Net Revenue & Payroll Engine (Canonical Facade).
 * 
 * Re-exports 100% of the public API from canonical payrollModules domain module.
 * Preserves 100% backward compatibility for all existing call sites.
 * Mandate 8b: Master Facade (<= 15 lines).
 */

export * from "./payrollModules/index.js";
