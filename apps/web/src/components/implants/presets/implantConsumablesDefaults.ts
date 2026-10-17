import type { ImplantConsumablesStock } from "./implantPresetTypes";

export const DEFAULT_CANONICAL_CONSUMABLES: ImplantConsumablesStock = {
	grafts: [
		{ id: "inv-bio-oss-05", name: "Костный графт Geistlich Bio-Oss (0.5г)", unitCostRub: "8200.00", lotNumber: "BO-8921", expirationDate: "2028-06-30", stockQuantity: "8.000" },
		{ id: "inv-bio-oss-10", name: "Костный графт Geistlich Bio-Oss (1.0г)", unitCostRub: "14500.00", lotNumber: "BO-9012", expirationDate: "2028-10-31", stockQuantity: "4.000" },
	],
	membranes: [
		{ id: "inv-bio-gide-1622", name: "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)", unitCostRub: "9800.00", lotNumber: "BG-3310", expirationDate: "2028-08-31", stockQuantity: "5.000" },
		{ id: "inv-bio-gide-2530", name: "Коллагеновая мембрана Geistlich Bio-Gide (25x30мм)", unitCostRub: "16200.00", lotNumber: "BG-4420", expirationDate: "2028-12-31", stockQuantity: "3.000" },
	],
	sutures: [
		{ id: "inv-vicryl-40", name: "Шовный материал Ethicon Викрил 4-0 (игла 19мм)", unitCostRub: "650.00", lotNumber: "VK-2026", expirationDate: "2027-12-31", stockQuantity: "20.000" },
		{ id: "inv-vicryl-50", name: "Шовный материал Ethicon Викрил 5-0 (игла 16мм)", unitCostRub: "720.00", lotNumber: "VK-2027", expirationDate: "2027-11-30", stockQuantity: "15.000" },
	],
};
