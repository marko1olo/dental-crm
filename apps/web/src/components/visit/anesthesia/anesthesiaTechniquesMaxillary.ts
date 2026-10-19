/**
 * anesthesiaTechniquesMaxillary.ts — Maxillary Conduction Anesthesia Techniques
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import { createTechniqueSpec } from "./anesthesiaTechniqueFactory";
import { MAXILLARY_EXTRA_TECHNIQUES } from "./anesthesiaTechniquesMaxillaryExtra";
import type { TechniqueSpecification } from "./anesthesiaTechniqueTypes";

export const MAXILLARY_TECHNIQUES: Record<string, TechniqueSpecification> = {
	tuberal: createTechniqueSpec({
		id: "tuberal",
		nameRu: "Туберальная анестезия бугра верхней челюсти",
		shortNameRu: "Туберальная",
		category: "conduction_maxillary",
		landmarksRu:
			"Бугор верхней челюсти, коронка второго моляра, скуловой отросток.",
		punctureRu:
			"Переходная складка позади скуло-альвеолярного гребня над вторым моляром.",
		targetNervesRu: ["nn. alveolares superiores posteriores"],
		recommendedNeedle: "gauge_30_medium_25mm",
		allowedNeedles: ["gauge_30_medium_25mm", "gauge_27_long_35mm"],
		depthMm: { min: 14, max: 18, target: 16 },
		requiresBoneContact: true,
		typicalCarpules: 1.0,
		typicalVolumeMl: 1.7,
		riskPercent: 18.0,
		riskTier: "critical_high",
		onsetMin: { min: 5, max: 8, defaultWaitTimeSec: 360 },
		pulpalMin: { min: 50, max: 70 },
		softTissueMin: { min: 150, max: 210 },
		zones: {
			teethDescRu: "Моляры верхней челюсти (6-8) и десна со щечной стороны",
			quadrantRu: "Верхний боковой сегмент",
			tongue: false,
			lip: false,
			cheek: true,
			palate: false,
			summaryRu: "Блокада задних верхних альвеолярных нервов.",
		},
		aspirationPlanes: 2,
		recommendationsRu:
			"Высокий риск гематомы крыловидного сплетения. Аспирация обязательна.",
	}),
	infraorbital: createTechniqueSpec({
		id: "infraorbital",
		nameRu: "Инфраорбитальная анестезия (подноглазничная)",
		shortNameRu: "Инфраорбитальная",
		category: "conduction_maxillary",
		landmarksRu:
			"Нижнеглазничный край, подглазничное отверстие, зрачковая линия.",
		punctureRu:
			"В переходную складку над верхушкой второго премоляра или клыка.",
		targetNervesRu: [
			"n. infraorbitalis",
			"nn. alveolares superiores anteriores",
		],
		recommendedNeedle: "gauge_30_medium_25mm",
		allowedNeedles: ["gauge_30_medium_25mm"],
		depthMm: { min: 12, max: 16, target: 14 },
		requiresBoneContact: true,
		typicalCarpules: 0.8,
		typicalVolumeMl: 1.4,
		riskPercent: 5.0,
		riskTier: "moderate",
		onsetMin: { min: 3, max: 5, defaultWaitTimeSec: 240 },
		pulpalMin: { min: 45, max: 60 },
		softTissueMin: { min: 120, max: 180 },
		zones: {
			teethDescRu: "Резцы, клык и премоляры верхней челюсти (1-5)",
			quadrantRu: "Верхний передний сегмент",
			tongue: false,
			lip: true,
			cheek: true,
			palate: false,
			summaryRu: "Обезболивание резцов, клыка, верхней губы и крыла носа.",
		},
		aspirationPlanes: 1,
		recommendationsRu:
			"Пальцевое прижатие подглазничного отверстия после введения.",
	}),
	...MAXILLARY_EXTRA_TECHNIQUES,
};
