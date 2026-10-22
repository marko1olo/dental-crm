import { parseKopecks } from "@dental/shared";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { ALL_PROCEDURE_TECH_MAPS } from "../inventoryTechMaps.js";
import type {
	ClinicalTechMapPackage,
	DeductionLineItem,
} from "./inventoryMathTypes.js";
import { matchMaterialToWarehouse } from "./inventoryMathStock.js";
import {
	createDeductionLinesFromPackage as createFromPkg,
	createQuickCustomLineItem,
} from "./inventoryMathCustomLine.js";

export { createQuickCustomLineItem };

export function createDeductionLinesFromTechMaps(
	selectedMapCodes: readonly string[],
	warehouseItems: readonly InventoryItem[] = [],
	includeCommonPpe: boolean = false,
): DeductionLineItem[] {
	const codesToInclude = new Set<string>(selectedMapCodes);
	if (includeCommonPpe) {
		codesToInclude.add("SANPIN_PPE");
	}

	const lines: DeductionLineItem[] = [];
	const seenItemNames = new Set<string>();

	for (const techMap of ALL_PROCEDURE_TECH_MAPS) {
		if (!codesToInclude.has(techMap.code) && !codesToInclude.has(techMap.id)) {
			continue;
		}

		for (const specItem of techMap.items) {
			const normKey = specItem.materialName.toLowerCase().trim();
			if (seenItemNames.has(normKey)) {
				const existing = lines.find(
					(l) => l.materialName.toLowerCase().trim() === normKey,
				);
				if (existing) {
					existing.quantity = Number(
						(existing.quantity + specItem.standardQuantity).toFixed(4),
					);
				}
				continue;
			}
			seenItemNames.add(normKey);

			const matched = matchMaterialToWarehouse(specItem.materialName, warehouseItems);

			let unitCostKopecks = specItem.defaultUnitCostKopecks;
			let stockQty = 0;
			let criticalThreshold = 0;
			let lotNumber: string | undefined;
			let expirationDate: string | undefined;
			let inventoryItemId: string | undefined;

			if (matched) {
				inventoryItemId = matched.id;
				stockQty = matched.stockQuantity;
				criticalThreshold = matched.criticalThreshold;
				lotNumber = matched.lotNumber;
				expirationDate = matched.expirationDate;
				if (matched.unitCostRub !== undefined && matched.unitCostRub !== "") {
					try {
						unitCostKopecks = parseKopecks(matched.unitCostRub);
					} catch {
						unitCostKopecks = specItem.defaultUnitCostKopecks;
					}
				}
			}

			lines.push({
				id: `line-${specItem.id}-${Date.now()}-${(Date.now() % 100000).toString(36)}`,
				materialName: specItem.materialName,
				category: specItem.category,
				unit: specItem.unit,
				quantity: specItem.standardQuantity,
				standardQuantity: specItem.standardQuantity,
				unitCostKopecks,
				stockQuantity: stockQty,
				criticalThreshold,
				inventoryItemId,
				lotNumber,
				expirationDate,
				lotTrackingRequired: specItem.lotTrackingRequired,
				source: "tech_map",
				techMapCode: techMap.code,
				mandatory: specItem.mandatory,
			});
		}
	}

	return lines;
}

export function createDeductionLinesFromPackage(
	pkg: ClinicalTechMapPackage | string,
	warehouseItems: readonly InventoryItem[] = [],
): DeductionLineItem[] {
	return createFromPkg(pkg, warehouseItems, createDeductionLinesFromTechMaps);
}
