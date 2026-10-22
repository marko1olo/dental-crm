import { parseKopecks } from "@dental/shared";
import type { InventoryItem } from "../inventoryDataMappers.js";
import type {
	ClinicalTechMapPackage,
	DeductionLineItem,
} from "./inventoryMathTypes.js";
import { CLINICAL_PROCEDURE_PACKAGES } from "./inventoryMathPackages.js";
import { matchMaterialToWarehouse } from "./inventoryMathStock.js";

export function createDeductionLinesFromPackage(
	pkg: ClinicalTechMapPackage | string,
	warehouseItems: readonly InventoryItem[] = [],
	createFromTechMaps: (
		selectedMapCodes: readonly string[],
		warehouseItems?: readonly InventoryItem[],
		includeCommonPpe?: boolean,
	) => DeductionLineItem[] = () => [],
): DeductionLineItem[] {
	const targetPackage =
		typeof pkg === "string"
			? CLINICAL_PROCEDURE_PACKAGES.find(
					(p) => p.id === pkg || p.title === pkg,
				)
			: pkg;
	if (!targetPackage) {
		return [];
	}
	return createFromTechMaps(
		targetPackage.codes,
		warehouseItems,
		true,
	);
}

export function createQuickCustomLineItem(
	materialName: string,
	options?: {
		unit?: string;
		quantity?: number;
		warehouseItems?: readonly InventoryItem[];
		unitCostRub?: string | number;
	},
): DeductionLineItem {
	const trimmedName = materialName.trim();
	const unit = options?.unit?.trim() || "шт.";
	const qty =
		options?.quantity !== undefined && options.quantity > 0
			? options.quantity
			: 1;
	const warehouseItems = options?.warehouseItems || [];
	const matched = matchMaterialToWarehouse(trimmedName, warehouseItems);

	let unitCostKopecks = 0;
	if (options?.unitCostRub !== undefined) {
		try {
			unitCostKopecks =
				typeof options.unitCostRub === "number"
					? Math.round(options.unitCostRub * 100)
					: parseKopecks(options.unitCostRub);
		} catch {
			unitCostKopecks = 0;
		}
	} else if (matched?.unitCostRub !== undefined && matched.unitCostRub !== "") {
		try {
			unitCostKopecks = parseKopecks(matched.unitCostRub);
		} catch {
			unitCostKopecks = 0;
		}
	}

	return {
		id: `custom-quick-${Date.now()}-${(Date.now() % 100000).toString(36)}`,
		materialName: trimmedName,
		category: "other",
		unit,
		quantity: qty,
		standardQuantity: qty,
		unitCostKopecks,
		stockQuantity: matched?.stockQuantity ?? 0,
		criticalThreshold: matched?.criticalThreshold ?? 0,
		inventoryItemId: matched?.id,
		lotNumber: matched?.lotNumber,
		expirationDate: matched?.expirationDate,
		source: "manual",
		mandatory: false,
	};
}
