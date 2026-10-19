/**
 * anesthesiaTechniquesMandibularExtra.ts — Akinosi, Torusal & Mental Techniques
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import { createTechniqueSpec } from "./anesthesiaTechniqueFactory";
import type { TechniqueSpecification } from "./anesthesiaTechniqueTypes";

export const MANDIBULAR_EXTRA_TECHNIQUES: Record<
	string,
	TechniqueSpecification
> = {
	mandibular_akinosi: createTechniqueSpec({
		id: "mandibular_akinosi",
		nameRu: "Мандибулярная блокада по Акинози-Вазирани",
		shortNameRu: "По Акинози (Akinosi)",
		category: "conduction_mandibular",
		landmarksRu:
			"Слизисто-десневая граница верхних моляров при сомкнутых челюстях.",
		punctureRu: "Мягкие ткани медиальнее ветви челюсти при сомкнутых зубах.",
		targetNervesRu: [
			"n. alveolaris inferior",
			"n. lingualis",
			"n. mylohyoideus",
		],
		recommendedNeedle: "gauge_27_long_35mm",
		allowedNeedles: ["gauge_27_long_35mm"],
		depthMm: { min: 22, max: 26, target: 25 },
		requiresBoneContact: false,
		typicalCarpules: 1.0,
		typicalVolumeMl: 1.7,
		riskPercent: 8.0,
		riskTier: "moderate",
		onsetMin: { min: 8, max: 12, defaultWaitTimeSec: 540 },
		pulpalMin: { min: 55, max: 80 },
		softTissueMin: { min: 180, max: 240 },
		zones: {
			teethDescRu: "Зубы квадранта (1-8)",
			quadrantRu: "Нижний квадрант",
			tongue: true,
			lip: true,
			cheek: true,
			palate: false,
			summaryRu: "Блокада при тризме и затрудненном открывании рта.",
		},
		aspirationPlanes: 2,
		recommendationsRu:
			"Инъекция выполняется без контакта с костью параллельно окклюзии верхних зубов.",
	}),
	torusal: createTechniqueSpec({
		id: "torusal",
		nameRu: "Торусальная анестезия (по Вейсбрему)",
		shortNameRu: "Торусальная",
		category: "conduction_mandibular",
		landmarksRu: "Нижнечелюстной валик, крыловидно-челюстная складка.",
		punctureRu:
			"В бороздку нижнечелюстного валика при максимально открытом рте.",
		targetNervesRu: ["n. alveolaris inferior", "n. lingualis", "n. buccalis"],
		recommendedNeedle: "gauge_27_long_35mm",
		allowedNeedles: ["gauge_27_long_35mm", "gauge_30_medium_25mm"],
		depthMm: { min: 15, max: 20, target: 18 },
		requiresBoneContact: true,
		typicalCarpules: 1.0,
		typicalVolumeMl: 1.7,
		riskPercent: 10.0,
		riskTier: "critical_high",
		onsetMin: { min: 8, max: 12, defaultWaitTimeSec: 500 },
		pulpalMin: { min: 60, max: 90 },
		softTissueMin: { min: 180, max: 280 },
		zones: {
			teethDescRu: "Все зубы половины нижней челюсти",
			quadrantRu: "Нижний квадрант",
			tongue: true,
			lip: true,
			cheek: true,
			palate: false,
			summaryRu: "Надежное обезболивание моляров, премоляров и языка.",
		},
		aspirationPlanes: 2,
		recommendationsRu: "Двухплоскостная аспирационная проба обязательна.",
	}),
	mental_incisive: createTechniqueSpec({
		id: "mental_incisive",
		nameRu: "Ментальная и резцовая блокада подбородочного отверстия",
		shortNameRu: "Ментальная",
		category: "conduction_mandibular",
		landmarksRu:
			"Подбородочное отверстие между корнями премоляров нижней челюсти.",
		punctureRu: "В переходную складку над подбородочным отверстием.",
		targetNervesRu: ["n. mentalis", "n. incisivus"],
		recommendedNeedle: "gauge_30_short_21mm",
		allowedNeedles: ["gauge_30_short_21mm", "gauge_30_medium_25mm"],
		depthMm: { min: 5, max: 8, target: 6 },
		requiresBoneContact: true,
		typicalCarpules: 0.6,
		typicalVolumeMl: 1.0,
		riskPercent: 4.5,
		riskTier: "moderate",
		onsetMin: { min: 3, max: 5, defaultWaitTimeSec: 240 },
		pulpalMin: { min: 45, max: 60 },
		softTissueMin: { min: 120, max: 180 },
		zones: {
			teethDescRu: "Премоляры, клык и резцы соответствующей стороны (1-5)",
			quadrantRu: "Передний нижний сегмент",
			tongue: false,
			lip: true,
			cheek: true,
			palate: false,
			summaryRu:
				"Обезболивание премоляров, резцов и нижней губы без онемения языка.",
		},
		aspirationPlanes: 1,
		recommendationsRu:
			"Прижать пальцем область отверстия на 1 минуту для прохождения раствора в канал.",
	}),
};
