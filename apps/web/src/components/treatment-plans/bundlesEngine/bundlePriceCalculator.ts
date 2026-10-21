import {
	type Kopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type {
	ClinicalBundleId,
	ClinicalBundleItemTemplate,
} from "../treatmentPlanBundlesPresets";
import { getClinicalBundleById } from "./bundleRegistry";

export interface BundlePriceBreakdown {
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly selectedItems: readonly ClinicalBundleItemTemplate[];
	readonly excludedItems: readonly ClinicalBundleItemTemplate[];
	readonly savingsRub: number;
	readonly savingsKopecks: Kopecks;
	readonly isFullySelected: boolean;
}

export function calculateBundlePrice(
	bundleId: ClinicalBundleId,
	selectedItemIds?: readonly string[],
): BundlePriceBreakdown {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Пакет не найден: ${bundleId}`);
	}

	const selectedSet =
		selectedItemIds && selectedItemIds.length > 0 ? new Set(selectedItemIds) : null;

	const selectedItems: ClinicalBundleItemTemplate[] = [];
	const excludedItems: ClinicalBundleItemTemplate[] = [];

	for (const item of bundle.items) {
		if (selectedSet === null || selectedSet.has(item.id)) {
			selectedItems.push(item);
		} else {
			excludedItems.push(item);
		}
	}

	const totalRub = selectedItems.reduce((acc, it) => acc + it.defaultPriceRub, 0);
	const totalKopecks = sumKopecks(
		selectedItems.map((it) => it.defaultPriceKopecks ?? parseKopecks(it.defaultPriceRub)),
	);

	const savingsRub = Math.max(0, bundle.totalPriceRub - totalRub);
	const savingsKopecks = Math.max(0, bundle.totalPriceKopecks - totalKopecks) as Kopecks;

	return {
		totalRub,
		totalKopecks,
		selectedItems,
		excludedItems,
		savingsRub,
		savingsKopecks,
		isFullySelected: excludedItems.length === 0,
	};
}
