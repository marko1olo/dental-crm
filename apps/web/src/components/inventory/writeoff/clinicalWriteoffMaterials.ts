import { parseKopecks } from "@dental/shared";
import type { ClinicalMaterialDefinition } from "./clinicalWriteoffPresets.js";

export const CLINICAL_MATERIALS_CATALOG: readonly ClinicalMaterialDefinition[] = [
	{
		id: "mat_articaine_ultracain",
		sku: "AN-ART-01",
		nameRu: "Артикаин с адреналином 1:100 000 (1.7 мл)",
		category: "anesthesia",
		unit: "карп",
		okeiCode: "778",
		defaultUnitCostKopecks: parseKopecks("145.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "Упаковка 50 карпул",
	},
	{
		id: "mat_dental_needle_30g",
		sku: "NDL-30G",
		nameRu: "Игла карпульная стоматологическая 30G",
		category: "anesthesia",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("12.50"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "Коробка 100 шт",
	},
	{
		id: "mat_composite_filtek_a2",
		sku: "CMP-FLT-A2",
		nameRu: "Композит светового отверждения Filtek Ultimate A2",
		category: "composite",
		unit: "г",
		okeiCode: "163",
		defaultUnitCostKopecks: parseKopecks("3850.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "Шприц 4 г",
	},
	{
		id: "mat_gloves_nitrile_m",
		sku: "PPE-GLV-M",
		nameRu: "Перчатки смотровые нитриловые (размер M)",
		category: "ppe",
		unit: "пар",
		okeiCode: "715",
		defaultUnitCostKopecks: parseKopecks("18.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "Коробка 100 пар",
	},
	{
		id: "mat_antiseptic_chlorhexidine",
		sku: "ANT-CHX-005",
		nameRu: "Хлоргексидина биглюконат 0.05% (100 мл)",
		category: "disinfection",
		unit: "фл",
		okeiCode: "778",
		defaultUnitCostKopecks: parseKopecks("45.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "Флакон 100 мл",
	},
];

export function getClinicalMaterialById(materialId: string): ClinicalMaterialDefinition | undefined {
	return CLINICAL_MATERIALS_CATALOG.find((m) => m.id === materialId);
}
