/**
 * index.ts — Canonical SSOT exports for Insurance & Russian DMS subsystem.
 *
 * Mandates: 8b (Healthy sweet spot <= 120 lines), 8e, 8n.
 */

export * from "./insuranceData.js";
export * from "./InsuranceWorkspaceModal.js";
export * from "./InsuranceBillSplitCard.js";
export * from "./DirectInsuranceLauncher.js";
export { InsuranceWorkspaceModal as DmsGuaranteeLetterModal } from "./InsuranceWorkspaceModal.js";
export { InsuranceBillSplitCard as DmsBillSplitCalculatorSection } from "./InsuranceBillSplitCard.js";
