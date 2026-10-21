import type { TreatmentPlanStage, TreatmentPlanTierId } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { isDemoShowcaseMode } from "../../treatmentPlanAutoGenerator";
import { getEconomyPresetStages } from "./economyPreset";
import { getStandardPresetStages } from "./standardPreset";
import { getOptimumPresetStages } from "./optimumPreset";

export function getDefaultClinicalPresetStages(
	tierId: TreatmentPlanTierId,
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);

	if (tierId === "economy") {
		return getEconomyPresetStages(catalog, validDiscountPct, isDemo);
	}

	if (tierId === "standard") {
		return getStandardPresetStages(catalog, validDiscountPct, isDemo);
	}

	return getOptimumPresetStages(catalog, validDiscountPct, isDemo);
}

export { getEconomyPresetStages, getStandardPresetStages, getOptimumPresetStages };
