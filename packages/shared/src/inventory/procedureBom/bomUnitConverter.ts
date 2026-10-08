import type { ConsumableUnit } from "./types.js";
import { getStandardBOMForProcedure } from "./bomItemMatcher.js";

/**
 * Pure helper: Calculates the material cost and items breakdown for a specific 804n procedure.
 */
export function calculateProcedureMaterialsCost(
	procedureCode804n: string,
	quantity = 1,
): {
	totalCostKopecks: number;
	materials: Array<{ nameRu: string; qty: number; unit: ConsumableUnit; costKopecks: number }>;
} {
	const bom = getStandardBOMForProcedure(procedureCode804n);
	if (!bom) {
		return { totalCostKopecks: 0, materials: [] };
	}

	let total = 0;
	const mats = bom.materials.map((m) => {
		const itemQty = Number((m.standardQuantity * quantity).toFixed(4));
		const itemCost = Math.round(m.estimatedUnitCostKopecks * quantity * m.standardQuantity);
		total += itemCost;
		return {
			nameRu: m.nameRu,
			qty: itemQty,
			unit: m.unitOfMeasure,
			costKopecks: itemCost,
		};
	});

	return {
		totalCostKopecks: total,
		materials: mats,
	};
}
