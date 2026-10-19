/**
 * anesthesiaTechniquesInfiltration.ts — Infiltration & Periodontal Techniques
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import { createTechniqueSpec } from "./anesthesiaTechniqueFactory";
import type { TechniqueSpecification } from "./anesthesiaTechniqueTypes";

export const INFILTRATION_TECHNIQUES: Record<string, TechniqueSpecification> = {
	infiltration_supraperiosteal: createTechniqueSpec({
		id: "infiltration_supraperiosteal",
		nameRu: "Инфильтрационная наднадкостничная анестезия",
		shortNameRu: "Инфильтрация",
		category: "infiltration",
		landmarksRu:
			"Переходная складка в проекции верхушки корня причинного зуба.",
		punctureRu: "В подвижную слизистую переходной складки над верхушкой корня.",
		targetNervesRu: ["Зубные ветви верхнего/нижнего зубного сплетения"],
		recommendedNeedle: "gauge_30_short_21mm",
		allowedNeedles: ["gauge_30_short_21mm", "gauge_30_medium_25mm"],
		depthMm: { min: 3, max: 6, target: 4 },
		requiresBoneContact: true,
		typicalCarpules: 1.0,
		typicalVolumeMl: 1.7,
		riskPercent: 1.5,
		riskTier: "minimal",
		onsetMin: { min: 2, max: 4, defaultWaitTimeSec: 180 },
		pulpalMin: { min: 45, max: 60 },
		softTissueMin: { min: 120, max: 180 },
		zones: {
			teethDescRu: "Причинный зуб и 1-2 соседних зуба в зоне инфильтрации",
			quadrantRu: "Локальный сектор",
			tongue: false,
			lip: false,
			cheek: true,
			palate: false,
			summaryRu:
				"Стандартное глубокое обезболивание для препарирования и эндодонтии.",
		},
		aspirationPlanes: 1,
		recommendationsRu:
			"Скорость введения 1 мл/мин. Скос иглы направлен к кости.",
	}),
	intraligamentary_pdl: createTechniqueSpec({
		id: "intraligamentary_pdl",
		nameRu: "Интралигаментарная анестезия (периодонтальная PDL)",
		shortNameRu: "Интралигаментарная",
		category: "intraligamentary_pressure",
		landmarksRu:
			"Десневая борозда причинного зуба, угол между корнем и стенкой альвеолы.",
		punctureRu:
			"В периодонтальную щель вдоль оси корня зуба под углом 30° к зубу.",
		targetNervesRu: ["Периодонтальные рецепторы и периапикальные ветви зуба"],
		recommendedNeedle: "gauge_30_ultrashort_12mm",
		allowedNeedles: ["gauge_30_ultrashort_12mm", "gauge_30_extrashort_8mm"],
		depthMm: { min: 2, max: 4, target: 3 },
		requiresBoneContact: true,
		typicalCarpules: 0.2,
		typicalVolumeMl: 0.4,
		targetPressureAtm: { min: 10, max: 15, isHighPressure: true },
		riskPercent: 0.1,
		riskTier: "minimal",
		onsetMin: { min: 0.5, max: 1.5, defaultWaitTimeSec: 60 },
		pulpalMin: { min: 30, max: 45 },
		softTissueMin: { min: 45, max: 60 },
		zones: {
			teethDescRu: "Строго 1 причинный зуб",
			quadrantRu: "Один зуб",
			tongue: false,
			lip: false,
			cheek: false,
			palate: false,
			summaryRu:
				"Мгновенное обезболивание 1 зуба без онемения губ, щек и языка.",
		},
		aspirationPlanes: 1,
		recommendationsRu:
			"Использовать дозатор высокого давления (0.2 мл на корень).",
	}),
	intraosseous_quicksleeper: createTechniqueSpec({
		id: "intraosseous_quicksleeper",
		nameRu: "Внутрикостная анестезия (QuickSleeper / интрасептальная)",
		shortNameRu: "Внутрикостная",
		category: "intraosseous",
		landmarksRu: "Межзубная костная перегородка в области прикрепленной десны.",
		punctureRu:
			"В центр межзубной перегородки на 2 мм ниже вершины десневого сосочка.",
		targetNervesRu: ["Губчатое вещество кости и верхушечные нервные волокна"],
		recommendedNeedle: "gauge_30_extrashort_8mm",
		allowedNeedles: ["gauge_30_extrashort_8mm"],
		depthMm: { min: 4, max: 8, target: 6 },
		requiresBoneContact: true,
		typicalCarpules: 0.5,
		typicalVolumeMl: 0.9,
		targetPressureAtm: { min: 8, max: 12, isHighPressure: true },
		riskPercent: 0.1,
		riskTier: "minimal",
		onsetMin: { min: 0.5, max: 1.0, defaultWaitTimeSec: 30 },
		pulpalMin: { min: 45, max: 60 },
		softTissueMin: { min: 60, max: 90 },
		zones: {
			teethDescRu: "1-3 зуба вокруг места инъекции",
			quadrantRu: "Межзубный сектор",
			tongue: false,
			lip: false,
			cheek: false,
			palate: false,
			summaryRu:
				"Компьютерная внутрикостная анестезия с немедленным наступлением эффекта.",
		},
		aspirationPlanes: 1,
		recommendationsRu:
			"Использовать специализированный наконечник с вращением иглы.",
	}),
};
