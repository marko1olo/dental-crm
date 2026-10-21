import type {
	CatalogServiceItem,
	PlanPricePolicyPreset,
	PriceLockResolutionPolicy,
	TreatmentPlanItemValidationContext,
} from "../planPriceValidationPresets";
import { findCatalogService } from "./catalogLookup";
import { classifyItemDiscrepancy } from "./discrepancyClassifier";
import type { ValidatedPlanItem } from "./types";

/**
 * Валидация одной позиции сметы относительно текущего каталога и настроенной политики.
 */
export function validateSinglePlanItem(
	item: TreatmentPlanItemValidationContext,
	catalog: readonly CatalogServiceItem[],
	preset: PlanPricePolicyPreset,
	isPlanExpired: boolean,
	resolutionOverride?: PriceLockResolutionPolicy | undefined,
	customPriceOverrideRub?: number | undefined,
): ValidatedPlanItem {
	const catalogService = findCatalogService(item.code804n, item.serviceId, catalog);

	const planUnitPriceRub = Math.max(0, item.planUnitPriceRub);
	const planDiscountRub = Math.max(0, item.planDiscountRub);
	const quantity = Math.max(1, item.quantity);
	const planLineGrossRub = planUnitPriceRub * quantity;
	const planLineNetRub = Math.max(0, planLineGrossRub - planDiscountRub * quantity);

	const isNotFound = !catalogService;
	const isArchived = Boolean(catalogService && (!catalogService.active || catalogService.isArchived));
	const currentCatalogPriceRub = catalogService ? catalogService.basePriceRub : planUnitPriceRub;
	const currentCatalogActive = catalogService ? Boolean(catalogService.active && !catalogService.isArchived) : false;

	const unitPriceDeltaRub = currentCatalogPriceRub - planUnitPriceRub;
	const unitPriceDeltaPercent =
		planUnitPriceRub > 0 ? Number(((unitPriceDeltaRub / planUnitPriceRub) * 100).toFixed(1)) : 0;
	const lineTotalDeltaRub = unitPriceDeltaRub * quantity;

	const discrepancy = classifyItemDiscrepancy(
		isNotFound,
		isArchived,
		unitPriceDeltaRub,
		unitPriceDeltaPercent,
		item.planDiscountPercent,
		preset,
		isPlanExpired,
	);

	let requiresAdminOverride = discrepancy.requiresAdminOverride;
	if (isPlanExpired && discrepancy.discrepancyKind !== "SERVICE_ARCHIVED" && discrepancy.discrepancyKind !== "SERVICE_NOT_FOUND") {
		requiresAdminOverride = false;
	}

	const selectedResolution: PriceLockResolutionPolicy = resolutionOverride || discrepancy.suggestedResolution;

	let effectiveUnitPriceRub = planUnitPriceRub;
	let effectiveDiscountRub = planDiscountRub;

	if (selectedResolution === "UPDATE_TO_CURRENT_PRICE") {
		effectiveUnitPriceRub = currentCatalogPriceRub;
		effectiveDiscountRub = item.planDiscountPercent > 0 ? Math.round((currentCatalogPriceRub * item.planDiscountPercent) / 100) : 0;
	} else if (selectedResolution === "CUSTOM_PRICE_OVERRIDE" && typeof customPriceOverrideRub === "number") {
		effectiveUnitPriceRub = Math.max(0, customPriceOverrideRub);
		effectiveDiscountRub = 0;
	}

	const effectiveLineGrossRub = effectiveUnitPriceRub * quantity;
	const effectiveLineNetRub = Math.max(0, effectiveLineGrossRub - effectiveDiscountRub * quantity);

	let clinicAbsorptionRub = 0;
	if (selectedResolution === "LOCK_ORIGINAL_PRICE" && currentCatalogPriceRub > planUnitPriceRub) {
		clinicAbsorptionRub = (currentCatalogPriceRub - planUnitPriceRub) * quantity;
	}

	return {
		itemId: item.itemId,
		toothNumber: item.toothNumber,
		code804n: item.code804n,
		serviceTitle: item.serviceTitle,
		category: item.category,
		quantity,
		planUnitPriceRub,
		planDiscountPercent: item.planDiscountPercent,
		planDiscountRub,
		planLineGrossRub,
		planLineNetRub,
		catalogService,
		currentCatalogPriceRub,
		currentCatalogActive,
		isArchived,
		isNotFound,
		unitPriceDeltaRub,
		unitPriceDeltaPercent,
		lineTotalDeltaRub,
		discrepancyKind: discrepancy.discrepancyKind,
		severity: discrepancy.severity,
		statusBadgeText: discrepancy.statusBadgeText,
		requiresAdminOverride,
		suggestedResolution: discrepancy.suggestedResolution,
		selectedResolution,
		customPriceRub: customPriceOverrideRub,
		effectiveUnitPriceRub,
		effectiveDiscountRub,
		effectiveLineGrossRub,
		effectiveLineNetRub,
		clinicAbsorptionRub,
	};
}
