/**
 * doctorNetSalaryEngine.ts — Statutory Doctor Net Revenue & Form T-51 Payroll Engine (Canonical Facade).
 * 
 * Re-exports 100% of the public API from the decomposed netSalary domain module.
 * Preserves 100% backward compatibility for all existing call sites.
 * Layer 5: Master Facade (<= 50 lines).
 */

export * from "./netSalary/index.js";
