/**
 * anesthesiaTechniquesMaxillaryExtra.ts — Palatal Conduction Anesthesia Techniques
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import { createTechniqueSpec } from "./anesthesiaTechniqueFactory";
import type { TechniqueSpecification } from "./anesthesiaTechniqueTypes";

export const MAXILLARY_EXTRA_TECHNIQUES: Record<
	string,
	TechniqueSpecification
> = {
	greater_palatine: createTechniqueSpec({
		id: "greater_palatine",
		nameRu: "Небная анестезия (большое небное отверстие)",
		shortNameRu: "Небная",
		category: "conduction_palatal",
		landmarksRu: "Большое небное отверстие медиальнее 8-го или 7-го моляра.",
		punctureRu: "Мягкие ткани неба на 1 см кпереди от отверстия.",
		targetNervesRu: ["n. palatinus major"],
		recommendedNeedle: "gauge_30_ultrashort_12mm",
		allowedNeedles: ["gauge_30_ultrashort_12mm", "gauge_30_short_21mm"],
		depthMm: { min: 3, max: 5, target: 4 },
		requiresBoneContact: true,
		typicalCarpules: 0.3,
		typicalVolumeMl: 0.5,
		riskPercent: 1.0,
		riskTier: "low",
		onsetMin: { min: 2, max: 3, defaultWaitTimeSec: 150 },
		pulpalMin: { min: 30, max: 45 },
		softTissueMin: { min: 90, max: 120 },
		zones: {
			teethDescRu: "Небная слизистая от третьего моляра до клыка",
			quadrantRu: "Небный сектор",
			tongue: false,
			lip: false,
			cheek: false,
			palate: true,
			summaryRu:
				"Обезболивание слизистой оболочки твердого неба со стороны моляров.",
		},
		aspirationPlanes: 1,
		recommendationsRu:
			"Вводить очень медленно под давлением из-за плотности надкостницы.",
	}),
	incisive_canal: createTechniqueSpec({
		id: "incisive_canal",
		nameRu: "Резцовая анестезия (носонёбный нерв)",
		shortNameRu: "Резцовая",
		category: "conduction_palatal",
		landmarksRu: "Резцовый сосочек позади центральных верхних резцов.",
		punctureRu: "В основание резцового сосочка сбоку под углом 45° к небу.",
		targetNervesRu: ["n. nasopalatinus"],
		recommendedNeedle: "gauge_30_ultrashort_12mm",
		allowedNeedles: ["gauge_30_ultrashort_12mm"],
		depthMm: { min: 3, max: 5, target: 4 },
		requiresBoneContact: true,
		typicalCarpules: 0.2,
		typicalVolumeMl: 0.3,
		riskPercent: 1.0,
		riskTier: "low",
		onsetMin: { min: 2, max: 3, defaultWaitTimeSec: 150 },
		pulpalMin: { min: 30, max: 40 },
		softTissueMin: { min: 90, max: 120 },
		zones: {
			teethDescRu: "Небная слизистая переднего сектора (от клыка до клыка)",
			quadrantRu: "Переднее небо",
			tongue: false,
			lip: false,
			cheek: false,
			palate: true,
			summaryRu:
				"Обезболивание небной десны в области верхних резцов и клыков.",
		},
		aspirationPlanes: 1,
		recommendationsRu:
			"Очень чувствительная зона: предварительная аппликационная анестезия.",
	}),
};
