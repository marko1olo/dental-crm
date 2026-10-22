import { parseKopecks } from "@dental/shared";
import type { ClinicalMaterialDefinition } from "../clinicalWriteoffPresets.js";

export const MATERIALS_CATALOG_THERAPY_COMPOSITES: readonly ClinicalMaterialDefinition[] = [
	{
		id: "mat_filtek_ultimate",
		sku: "COMP-FILT-ULT",
		nameRu: "Нанокомпозит Filtek Ultimate (шприц 4 г, 3M ESPE)",
		category: "composite",
		unit: "г",
		okeiCode: "166",
		defaultUnitCostKopecks: parseKopecks("1350.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "шприц 4 г",
		descriptionRu: "Универсальный наногибридный реставрационный композит (прямое списание FIFO)",
	},
	{
		id: "mat_gradia_direct",
		sku: "COMP-GRAD-DIR",
		nameRu: "Композит светового отверждения Gradia Direct (шприц 4 г, GC)",
		category: "composite",
		unit: "г",
		okeiCode: "166",
		defaultUnitCostKopecks: parseKopecks("1280.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "шприц 4 г",
		descriptionRu: "Светоотверждаемый микронаполненный гибридный композит (прямое списание FIFO)",
	},
	{
		id: "mat_estelite_asteria",
		sku: "COMP-ESTEL-AST",
		nameRu: "Светоотверждаемый нанокомпозит Estelite Asteria (шприц 4 г, Tokuyama Dental)",
		category: "composite",
		unit: "г",
		okeiCode: "166",
		defaultUnitCostKopecks: parseKopecks("1450.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "шприц 4 г",
		descriptionRu: "Высокоэстетичный светоотверждаемый нанокомпозит с эффектом хамелеона (прямое списание FIFO)",
	},
];
