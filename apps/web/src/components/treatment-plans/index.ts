/**
 * index.ts — публичный интерфейс модуля планов лечения и финансовой оценки DENTE CRM.
 */

export * from "./types";
export type { ToothData } from "./types";
export {
	treatmentPlanItemSchema,
	treatmentPlanStageSchema,
	treatmentPlanSchema,
	type TreatmentPlan,
	type PlanPriceCatalogItem,
	kopecksToRub,
	rubToKopecks,
	formatRubles,
	isPlanPriceImmutable,
} from "./treatmentPlanTypes";
export { calculateChairsideInstallments } from "./treatmentPlanPricingEngine";
export * from "./treatmentPlanStagesEngine";
export * from "./treatmentPlanMaterialEngine";
export * from "./TreatmentPlan3TierComparison";
export * from "./TreatmentPlan3TierMobileSegmented";
export * from "./TreatmentPlanSignatureModal";
export * from "./TreatmentPlanContractPrint";
export * from "./completedActPrint";
export { TreatmentPlanStudioModal as TreatmentPlanPresenterModal } from "./TreatmentPlanStudioModal";
export { isMicroConsumable } from "./treatmentPlanConsumables";
export * from "./roadmap";
export * from "./bundlesEngine";
export * from "./autoGenerator";
export * from "./planPricing";
export * from "./treatmentPlanTherapyNorms";
export * from "./treatmentPlanSurgicalNorms";
export * from "./treatmentPlanActFormatters";
export * from "./actHeader";
export * from "./actMaterialsTable";
export * from "./actSignatures";
export * from "./treatmentPlanPricingEngine";
export * from "./TreatmentPlanStudioModal";
export * from "./treatmentPlanCatalogData";
