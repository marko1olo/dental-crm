/**
 * Семена хирургических биоматериалов (костные графты, мембраны, швы)
 * для складского модуля клиники (Мандаты 8e, 8n).
 */
export const CANONICAL_BIOMATERIAL_SEEDS = [
	{
		name: "Костный графт Geistlich Bio-Oss (гранулы 0.5г, 0.25-1мм)",
		category: "Хирургия",
		unit: "упак.",
		stockQuantity: "8.000",
		currentQty: "8.000",
		unitCostRub: "8200.00",
		pricePerUnit: "8200.00",
		sku: "BIO-OSS-05",
		barcode: "010761214000551110BO-892121SN-339182",
		lotNumber: "BO-8921",
		expirationDate: "2028-06-30",
		notes: "Ксеногенный костный материал Bio-Oss Small Granules (Geistlich Pharma)",
	},
	{
		name: "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)",
		category: "Хирургия",
		unit: "упак.",
		stockQuantity: "5.000",
		currentQty: "5.000",
		unitCostRub: "9800.00",
		pricePerUnit: "9800.00",
		sku: "BIO-GIDE-1622",
		barcode: "010761214000882210BG-331021SN-559281",
		lotNumber: "BG-3310",
		expirationDate: "2028-08-31",
		notes: "Биорезорбируемая барьерная коллагеновая мембрана Bio-Gide",
	},
	{
		name: "Шовный материал Ethicon Викрил 4-0 (рассасывающийся с иглой 19мм)",
		category: "Расходные материалы",
		unit: "шт.",
		stockQuantity: "20.000",
		currentQty: "20.000",
		unitCostRub: "650.00",
		pricePerUnit: "650.00",
		sku: "VICRYL-40",
		barcode: "010501014000773310VK-202621SN-901823",
		lotNumber: "VK-2026",
		expirationDate: "2027-12-31",
		notes: "Плетеный синтетический рассасывающийся шовный материал Викрил 4-0",
	},
];
