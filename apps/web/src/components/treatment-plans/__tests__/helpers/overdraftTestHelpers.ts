import type { ToothData } from "../../../odontogram/ToothChart";
import type { InventoryItemLookup } from "../../treatmentPlanMaterialEngine";

export const teethSampleOverdraft: ToothData[] = [
	{ toothNumber: 16, state: "Caries" },
	{ toothNumber: 26, state: "Caries" },
];

export const zeroStockInventorySample: InventoryItemLookup[] = [
	{
		id: "inv-anes-zero",
		name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 (Убистезин / Септонест)",
		stockQuantity: 0,
		unitCostRub: 220,
	},
	{
		id: "inv-comp-low",
		name: "Нанокомпозит светоотверждаемый (Estelite Asteria / Filtek)",
		stockQuantity: 0.1,
		unitCostRub: 1400,
	},
];
