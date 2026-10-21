import type {
	CatalogServiceItem,
	PlanPricePolicyPreset,
	PriceLockResolutionPolicy,
	TreatmentPlanItemValidationContext,
} from "../planPriceValidationPresets";
import { validateSinglePlanItem } from "./singleItemValidator";
import type { ValidatedPlanItem } from "./types";

export interface PlanItemsMetricsAccumulation {
	validatedItems: ValidatedPlanItem[];
	matchedItemsCount: number;
	increasedItemsCount: number;
	decreasedItemsCount: number;
	archivedItemsCount: number;
	notFoundItemsCount: number;
	discountedItemsCount: number;
	itemsRequiringAdminOverrideCount: number;
	originalPlanGrossRub: number;
	originalPlanDiscountRub: number;
	originalPlanNetRub: number;
	currentCatalogGrossRub: number;
	currentCatalogNetRub: number;
	resolvedGrossRub: number;
	resolvedDiscountRub: number;
	resolvedNetRub: number;
	totalClinicAbsorptionRub: number;
}

export function accumulatePlanItemsMetrics(
	planItems: readonly TreatmentPlanItemValidationContext[],
	catalog: readonly CatalogServiceItem[],
	preset: PlanPricePolicyPreset,
	isPlanExpired: boolean,
	itemResolutions?: Readonly<Record<string, PriceLockResolutionPolicy>>,
	customPrices?: Readonly<Record<string, number>>,
): PlanItemsMetricsAccumulation {
	const res: PlanItemsMetricsAccumulation = {
		validatedItems: [],
		matchedItemsCount: 0,
		increasedItemsCount: 0,
		decreasedItemsCount: 0,
		archivedItemsCount: 0,
		notFoundItemsCount: 0,
		discountedItemsCount: 0,
		itemsRequiringAdminOverrideCount: 0,
		originalPlanGrossRub: 0,
		originalPlanDiscountRub: 0,
		originalPlanNetRub: 0,
		currentCatalogGrossRub: 0,
		currentCatalogNetRub: 0,
		resolvedGrossRub: 0,
		resolvedDiscountRub: 0,
		resolvedNetRub: 0,
		totalClinicAbsorptionRub: 0,
	};

	for (const item of planItems) {
		const resolutionOverride = itemResolutions?.[item.itemId];
		const customPriceOverride = customPrices?.[item.itemId];

		const validated = validateSinglePlanItem(
			item,
			catalog,
			preset,
			isPlanExpired,
			resolutionOverride,
			customPriceOverride,
		);

		res.validatedItems.push(validated);

		if (validated.discrepancyKind === "PRICE_MATCH") res.matchedItemsCount++;
		else if (validated.discrepancyKind === "PRICE_INCREASED") res.increasedItemsCount++;
		else if (validated.discrepancyKind === "PRICE_DECREASED") res.decreasedItemsCount++;
		else if (validated.discrepancyKind === "SERVICE_ARCHIVED") res.archivedItemsCount++;
		else if (validated.discrepancyKind === "SERVICE_NOT_FOUND") res.notFoundItemsCount++;

		if (validated.planDiscountRub > 0) res.discountedItemsCount++;
		if (validated.requiresAdminOverride) res.itemsRequiringAdminOverrideCount++;

		res.originalPlanGrossRub += validated.planLineGrossRub;
		res.originalPlanDiscountRub += validated.planDiscountRub * validated.quantity;
		res.originalPlanNetRub += validated.planLineNetRub;

		res.currentCatalogGrossRub += validated.currentCatalogPriceRub * validated.quantity;
		res.currentCatalogNetRub += Math.max(0, (validated.currentCatalogPriceRub - validated.planDiscountRub) * validated.quantity);

		res.resolvedGrossRub += validated.effectiveLineGrossRub;
		res.resolvedDiscountRub += validated.effectiveDiscountRub * validated.quantity;
		res.resolvedNetRub += validated.effectiveLineNetRub;
		res.totalClinicAbsorptionRub += validated.clinicAbsorptionRub;
	}

	return res;
}
