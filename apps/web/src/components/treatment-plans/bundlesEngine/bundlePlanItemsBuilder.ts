import {
	type CatalogServiceLookupItem,
	matchCatalogService,
} from "../treatmentPlanPricingEngine";
import type { ClinicalBundleId } from "../treatmentPlanBundlesPresets";
import type { TreatmentPlanItem } from "../types";
import { calculateBundlePrice } from "./bundlePriceCalculator";
import { getClinicalBundleById } from "./bundleRegistry";

export interface CreateBundlePlanItemsOptions {
	readonly toothNumber?: number | undefined;
	readonly selectedItemIds?: readonly string[] | undefined;
	readonly customPriceMap?: Record<string, number> | undefined;
	readonly catalogPricelist?: readonly CatalogServiceLookupItem[] | undefined;
	readonly isDemoMode?: boolean | undefined;
}

export function createBundlePlanItems(
	bundleId: ClinicalBundleId,
	toothNumberOrOptions?: number | CreateBundlePlanItemsOptions,
): TreatmentPlanItem[] {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Неизвестный пакет: ${bundleId}`);
	}

	let toothNumber: number | undefined;
	let selectedItemIds: readonly string[] | undefined;
	let customPriceMap: Record<string, number> | undefined;
	let catalogPricelist: readonly CatalogServiceLookupItem[] | undefined;
	let isDemoMode: boolean | undefined;

	if (typeof toothNumberOrOptions === "number") {
		toothNumber = toothNumberOrOptions;
	} else if (toothNumberOrOptions && typeof toothNumberOrOptions === "object") {
		toothNumber = toothNumberOrOptions.toothNumber;
		selectedItemIds = toothNumberOrOptions.selectedItemIds;
		customPriceMap = toothNumberOrOptions.customPriceMap;
		catalogPricelist = toothNumberOrOptions.catalogPricelist;
		isDemoMode = toothNumberOrOptions.isDemoMode;
	}

	const effectiveTooth = bundle.requiresTooth
		? toothNumber && toothNumber > 0
			? toothNumber
			: bundle.defaultTooth
		: undefined;

	const breakdown = calculateBundlePrice(bundleId, selectedItemIds);
	const now = Date.now();

	return breakdown.selectedItems.map((item, idx) => {
		let finalPriceRub: number;
		let priceId: string;
		let fromCatalog = false;
		let isDraft = false;
		let requiresManualPricing = false;

		if (customPriceMap && customPriceMap[item.id] !== undefined) {
			finalPriceRub = Math.max(0, customPriceMap[item.id]!);
			priceId = `custom-${bundle.id}-${item.id}`;
			fromCatalog = false;
		} else if (catalogPricelist && catalogPricelist.length > 0) {
			const itemServiceCode = item.serviceCode || item.code804n || "";
			const matched = matchCatalogService(
				catalogPricelist,
				item.category,
				[item.name, itemServiceCode],
				item.defaultPriceRub,
				itemServiceCode,
				isDemoMode !== undefined ? { isDemoMode } : undefined,
			);
			finalPriceRub = matched.priceRub;
			priceId = matched.priceId || `bundle-${bundle.id}-${item.id}`;
			fromCatalog = matched.fromCatalog;
			isDraft = matched.isDraft;
			requiresManualPricing = matched.requiresManualPricing;
		} else {
			finalPriceRub = item.defaultPriceRub;
			priceId = `bundle-${bundle.id}-${item.id}`;
			fromCatalog = true;
			isDraft = false;
			requiresManualPricing = false;
		}

		const toothPrefix = effectiveTooth ? `[Зуб ${effectiveTooth}] ` : "";
		const uniqueId = `item-bundle-${bundle.id}-${effectiveTooth ?? "mouth"}-${now}-${idx + 1}`;

		return {
			id: uniqueId,
			priceId,
			toothNumber: effectiveTooth,
			serviceCode: item.serviceCode || item.code804n || "",
			code804n: item.code804n || item.serviceCode || "",
			name: `${toothPrefix}${item.name}`,
			category: item.category,
			priceRub: finalPriceRub,
			unitPriceRub: finalPriceRub,
			discountRub: 0,
			quantity: 1,
			phase: bundle.stageNumber,
			stageKind: bundle.stageKind,
			isAuto: false,
			materials: item.materials,
			clinicalRationale: item.clinicalRationale,
			fromCatalog,
			isDraft,
			requiresManualPricing,
		};
	});
}
