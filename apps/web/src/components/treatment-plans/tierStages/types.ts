/**
 * types.ts — Layer 0: Контракты типов для генерации 3-уровневых планов лечения.
 */

import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTierId } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";

export interface TierStagesGeneratorOptions {
	isDemoMode?: boolean;
}

export type {
	ToothData,
	ToothState,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTierId,
	CatalogServiceLookupItem,
};
