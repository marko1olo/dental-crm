import type { MaterialMeasurementUnit } from "../clinicalWriteoffPresets.js";

export const VISIT_CONFIGS = {
	therapy: [
		{ materialId: "mat_articaine_ultracain", quantity: 1, fallbackName: "Анестетик артикаиновый 4% 1.7 мл", fallbackCategory: "anesthesia" as const, fallbackUnit: "карп" as MaterialMeasurementUnit, fallbackCostKopecks: 23000 },
		{ materialId: "mat_dental_needle_30g", quantity: 1, fallbackName: "Игла карпульная 30G", fallbackCategory: "anesthesia" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 3000 },
		{ materialId: "mat_nitrile_gloves", quantity: 2, fallbackName: "Перчатки нитриловые (пара)", fallbackCategory: "ppe" as const, fallbackUnit: "пар" as MaterialMeasurementUnit, fallbackCostKopecks: 3800 },
		{ materialId: "mat_saliva_ejector", quantity: 1, fallbackName: "Слюноотсос одноразовый", fallbackCategory: "ppe" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 1400 },
		{ materialId: "mat_cotton_rolls", quantity: 6, fallbackName: "Ватные валики стерильные №2", fallbackCategory: "ppe" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 400 },
		{ materialId: "mat_patient_bib", quantity: 1, fallbackName: "Салфетка нагрудная", fallbackCategory: "ppe" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 800 },
	],
	surgery: [
		{ materialId: "mat_articaine_ultracain", quantity: 1, fallbackName: "Анестетик артикаиновый 4% 1.7 мл", fallbackCategory: "anesthesia" as const, fallbackUnit: "карп" as MaterialMeasurementUnit, fallbackCostKopecks: 23000 },
		{ materialId: "mat_dental_needle_30g", quantity: 1, fallbackName: "Игла карпульная 30G", fallbackCategory: "anesthesia" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 3000 },
		{ materialId: "mat_surg_blade_15", quantity: 1, fallbackName: "Лезвие скальпеля №15", fallbackCategory: "surgery" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 8500 },
		{ materialId: "mat_suture_vicryl_40", quantity: 1, fallbackName: "Шовный материал Викрил 4-0", fallbackCategory: "suture" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 38000 },
		{ materialId: "mat_hemostatic_sponge", quantity: 1, fallbackName: "Гемостатическая губка", fallbackCategory: "surgery" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 32000 },
	],
};
