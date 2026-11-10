/**
 * index.ts — публичный интерфейс модуля планов лечения и финансовой оценки DENTE CRM.
 */

export * from "./types";
export * from "./TreatmentPlanTierSelector";
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
export { calculateChairsideInstallments } from "./treatmentPlanMath";
export * from "./treatmentPlanStagesEngine";
export * from "./treatmentPlanMaterialEngine";
export * from "./TreatmentPlanStageCard";
export * from "./MissingPriceAlert";
export * from "./MissingPriceAlertHub";
export * from "./TreatmentPlan3TierComparison";
export * from "./TreatmentPlanSignatureModal";
export * from "./TreatmentPlanContractPrint";
export * from "./TreatmentPlanCompletedActPrint";
export * from "./TreatmentPlanPhased4StageView";
export { TreatmentPlanStudioModal as TreatmentPlanPresenterModal } from "./TreatmentPlanStudioModal";
export { isMicroConsumable } from "./treatmentPlanConsumables";
export * from "./TreatmentPlanRoadmap";
export * from "./TreatmentPlanModule";
export * from "./CuratorPlanAssignmentModal";
export * from "./treatmentPlanBundlesEngine";
export * from "./ClinicalBundlesPanel";
export * from "./ClinicalServiceBundlesModal";
export * from "./planPricing";
export * from "./treatmentPlanTherapyNorms";
export * from "./treatmentPlanSurgicalNorms";
export * from "./treatmentPlanActFormatters";
export * from "./TreatmentPlanActHeader";
export * from "./TreatmentPlanActMaterialsTable";
export * from "./TreatmentPlanActSignatures";
export * from "./TreatmentPlanStageItemRow";
export * from "./TreatmentPlanStageFooter";
export * from "./treatmentPlanMath";
export * from "./TreatmentPlanPrintView";
export * from "./TreatmentPlanStudioModal";
export * from "./treatmentPlanCatalogData";
