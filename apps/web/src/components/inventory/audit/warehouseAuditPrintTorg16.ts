import type { WarehouseTorg16WriteoffAct } from "./warehouseAuditTypes.js";
import { numberToRussianWordsKopecks } from "./warehouseAuditMath.js";
import { generateCanonicalTorg16Html } from "@dental/shared";

export function generateTorg16Html(act: WarehouseTorg16WriteoffAct): string {
	return generateCanonicalTorg16Html({
		actNumber: act.actNumber,
		actDate: act.actDate,
		inventoryDocNumber: act.inventoryDocNumber,
		organizationNameRu: act.organizationNameRu,
		organizationOkpo: act.organizationOkpo,
		organizationInn: act.organizationInn,
		warehouseNameRu: act.warehouseNameRu,
		molFullName: act.molFullName,
		molPosition: act.molPosition,
		reasonRu: act.reasonRu,
		commission: act.commission,
		items: act.items.map((it, idx) => ({
			itemIndex: idx + 1,
			sku: it.sku,
			nameRu: it.nameRu,
			unitRu: it.unitRu,
			okeiCode: it.okeiCode,
			batchNumber: it.batchNumber,
			expiryDate: it.expiryDate,
			quantity: it.quantity,
			unitCostKopecks: it.unitCostKopecks,
			totalCostKopecks: it.totalCostKopecks,
			totalCostRubles: it.totalCostRubles,
			defectDescriptionRu: it.defectDescriptionRu,
		})),
		totalQuantity: act.totalQuantity,
		totalCostKopecks: act.totalCostKopecks,
		totalCostRubles: act.totalCostRubles,
		totalCostWordsRu: numberToRussianWordsKopecks(act.totalCostKopecks),
	});
}
