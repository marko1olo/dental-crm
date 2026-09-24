/**
 * apps/api/src/services/money/index.ts
 *
 * Canonical facade for Dental CRM money calculation, debt calculation,
 * and 54-FZ statutory fiscal receipt generation engines.
 *
 * Mandate 8b: All money calculations must be exact to the kopeck.
 */

export * from "../../money/patientDebt.js";
export * from "../billing/fiscal54fzService.js";
export * from "../kkt/FiscalReceiptFactory.js";
