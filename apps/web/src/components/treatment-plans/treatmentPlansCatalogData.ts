/**
 * treatmentPlansCatalogData.ts — Фасад обратной совместимости SSOT планов лечения.
 * Канонический источник: treatmentPlanCatalogData.ts
 * Мандат 8b: Фасад <= 30 строк.
 */

export * from "./treatmentPlanCatalogData";
export {
	CANONICAL_TIER_DEFINITIONS,
	CANONICAL_CLINICAL_STAGES,
	sanitizePatientPresentationStages,
	buildCanonical3TierPlans,
	generateTreatmentPlanFromDiagnosis,
	applyDoctorDiscountToTiers,
	isTreatmentPlanExpired,
	type TreatmentTierDefinition,
} from "./treatmentPlanCatalogData";
