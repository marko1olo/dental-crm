/**
 * treatmentPlanTierComparisonEngine.ts — движок сравнения 3 сценариев плана лечения
 * («Эконом», «Стандарт», «Оптимальный») для презентации пациенту.
 *
 * Включает расчет 13% налогового вычета НДФЛ и рассрочки 0% в целых копейках (Мандат 8k).
 */

import type { ToothData } from "../odontogram/ToothChart.js";
import type { TreatmentPlanTier } from "./types.js";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine.js";
import { DEMO_SHOWCASE_TEETH, isDemoShowcaseMode } from "./treatmentPlanAutoGenerator.js";
import { generateTierPlanStages } from "./treatmentPlanTierStagesGenerator.js";
import {
	ECONOMY_TIER_META,
	STANDARD_TIER_META,
	OPTIMUM_TIER_META,
} from "./tierComparison/tierMetadataPresets.js";
import { assembleTierFromPreset } from "./tierComparison/makeTierHelper.js";

export * from "./tierComparison/tierMetadataPresets.js";
export * from "./tierComparison/makeTierHelper.js";

export function generate3TierPlanComparison(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	patientLoyaltyDiscountPercent: number = 0,
	_patientBonusBalanceRub: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] {
	const isDemo = options?.isDemoMode !== undefined ? options.isDemoMode : isDemoShowcaseMode();
	const validLoyaltyPct = Math.max(0, Math.min(100, patientLoyaltyDiscountPercent));

	const effectiveTeeth =
		isDemo &&
		(!teeth ||
			teeth.length === 0 ||
			!teeth.some(
				(t) =>
					(t.state && t.state !== "Healthy" && t.state !== "Filled") ||
					Boolean(t.boneLossLevel && t.boneLossLevel > 0),
			))
			? DEMO_SHOWCASE_TEETH
			: teeth;

	const economyStages = generateTierPlanStages("economy", effectiveTeeth, catalog, validLoyaltyPct, options);
	const standardStages = generateTierPlanStages("standard", effectiveTeeth, catalog, validLoyaltyPct, options);
	const optimumStages = generateTierPlanStages("optimum", effectiveTeeth, catalog, validLoyaltyPct, options);

	const economyTier = assembleTierFromPreset("economy", ECONOMY_TIER_META, economyStages);
	const standardTier = assembleTierFromPreset("standard", STANDARD_TIER_META, standardStages);
	const optimumTier = assembleTierFromPreset("optimum", OPTIMUM_TIER_META, optimumStages);

	return [economyTier, standardTier, optimumTier];
}

export const generate3TierTreatmentPlanOptions = generate3TierPlanComparison;
