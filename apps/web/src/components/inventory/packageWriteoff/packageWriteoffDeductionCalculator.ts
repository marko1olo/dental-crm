import type {
	ClinicalWriteoffPackage,
	OneClickPackageWriteOffDeductedItem,
} from "./packageWriteoffTypes.js";

export interface PackageDeductionComputation {
	readonly deductedItems: readonly OneClickPackageWriteOffDeductedItem[];
	readonly overdraftItems: ReadonlyArray<{
		nameRu: string;
		requestedQty: number;
		availableQty: number;
		deficitQty: number;
	}>;
	readonly totalCostKopecks: number;
	readonly totalQuantity: number;
}

export function calculatePackageDeductions(
	pkg: ClinicalWriteoffPackage,
	multiplier: number,
	stockMap: Map<string, number>,
): PackageDeductionComputation {
	const deductedItems: OneClickPackageWriteOffDeductedItem[] = [];
	const overdraftItems: Array<{
		nameRu: string;
		requestedQty: number;
		availableQty: number;
		deficitQty: number;
	}> = [];

	let totalCostKopecks = 0;
	let totalQuantity = 0;

	for (const item of pkg.items) {
		const neededQty = Number((item.standardQuantity * multiplier).toFixed(4));
		totalQuantity = Number((totalQuantity + neededQty).toFixed(4));

		let availableQty = 0;
		if (stockMap.has(item.id.toLowerCase().trim())) {
			availableQty = stockMap.get(item.id.toLowerCase().trim()) ?? 0;
		} else if (stockMap.has(item.sku.toLowerCase().trim())) {
			availableQty = stockMap.get(item.sku.toLowerCase().trim()) ?? 0;
		} else if (stockMap.has(item.nameRu.toLowerCase().trim())) {
			availableQty = stockMap.get(item.nameRu.toLowerCase().trim()) ?? 0;
		}

		const hasDeficit = availableQty < neededQty;
		const deficitQty = hasDeficit ? Number((neededQty - availableQty).toFixed(4)) : 0;
		const itemCostKopecks = Math.round(item.unitCostKopecks * neededQty);
		totalCostKopecks += itemCostKopecks;

		if (hasDeficit) {
			overdraftItems.push({
				nameRu: item.nameRu,
				requestedQty: neededQty,
				availableQty,
				deficitQty,
			});
		}

		deductedItems.push({
			id: item.id,
			sku: item.sku,
			nameRu: item.nameRu,
			quantity: neededQty,
			unit: item.unit,
			unitCostKopecks: item.unitCostKopecks,
			costKopecks: itemCostKopecks,
			isOverdraft: hasDeficit,
			deficitQty,
		});
	}

	return {
		deductedItems,
		overdraftItems,
		totalCostKopecks,
		totalQuantity,
	};
}
