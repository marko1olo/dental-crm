/**
 * types/index.ts — строго типизированные контракты и структуры данных планов лечения и смет DENTE CRM.
 */

export * from "./planStageTypes";
export * from "./planItemTypes";
export * from "./planTierTypes";
export * from "./planMaterialTypes";
export * from "./planActAndInvoiceTypes";
export * from "./planValidationTypes";
export type { CatalogServiceLookupItem } from "../pricingEngine/pricingCatalogMatcher";
export type { ClinicalBundleDefinition, ClinicalBundleId } from "../bundlesPresets/types";
export type { CompletedWorksActResult, InventoryItemLookup } from "../treatmentPlanMaterialEngine";
export type { CopilotCommandType } from "../../../services/ai/treatmentPlanCopilot";
export type { ToothData } from "../../odontogram/ToothChart";
