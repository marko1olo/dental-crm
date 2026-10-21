/**
 * types.ts — строго типизированные контракты и структуры данных планов лечения и смет DENTE CRM.
 */

export * from "./types/planStageTypes";
export * from "./types/planItemTypes";
export * from "./types/planTierTypes";
export * from "./types/planMaterialTypes";
export * from "./types/planActAndInvoiceTypes";

export type { ToothData } from "../odontogram/ToothChart";
export type { TreatmentPlanValidationPayload } from "./validation/planPriceValidationPresets";
export type { CatalogServiceLookupItem } from "./pricingEngine/pricingCatalogMatcher";
export type { ClinicalBundleDefinition, ClinicalBundleId } from "./bundlesPresets/types";
export type { CompletedWorksActResult, InventoryItemLookup } from "./treatmentPlanMaterialEngine";
export type { CopilotCommandType } from "../../services/ai/treatmentPlanCopilot";

