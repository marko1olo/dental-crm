/**
 * treatmentPlanMaterialEngine.ts — Клинико-складской движок списания материалов и калькуляции себестоимости DENTE CRM.
 */

import type { CompletedWorksActAndWriteOffData } from "./types";

export { THERAPY_MATERIAL_NORMS } from "./treatmentPlanTherapyNorms";
export { SURGICAL_MATERIAL_NORMS } from "./treatmentPlanSurgicalNorms";
export type CompletedWorksActResult = CompletedWorksActAndWriteOffData;

export {
	type InventoryItemLookup,
	ORDER_804N_MATERIAL_NORMS_MAP,
	matchMaterialToInventoryItem,
} from "./materialEngine/inventoryMatching";

export { calculateStageMaterialRequirements } from "./materialEngine/stageMaterialCalculations";

export {
	calculatePlanTotalMaterialCost,
	generateCompletedWorksActAndWriteOff,
} from "./materialEngine/planMaterialCalculations";
