/**
 * anesthesiaTechniquesMandibular.ts — Mandibular Conduction Techniques
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import { createTechniqueSpec } from "./anesthesiaTechniqueFactory";
import { MANDIBULAR_EXTRA_TECHNIQUES } from "./anesthesiaTechniquesMandibularExtra";
import type { TechniqueSpecification } from "./anesthesiaTechniqueTypes";

export const MANDIBULAR_TECHNIQUES: Record<string, TechniqueSpecification> = {
	mandibular_weisbrem: createTechniqueSpec({
		id: "mandibular_weisbrem",
		nameRu: "Мандибулярная проводниковая по Вайсбрему (Торусальная)",
		shortNameRu: "Мандибулярная (Вайсбрем)",
		category: "conduction_mandibular",
		landmarksRu:
			"Нижнечелюстной валик, борозда позади моляра 8, крыловидно-челюстная складка.",
		punctureRu:
			"В бороздку нижнечелюстного валика на 0.5 см ниже окклюзии верхних моляров.",
		targetNervesRu: ["n. alveolaris inferior", "n. lingualis", "n. buccalis"],
		recommendedNeedle: "gauge_27_long_35mm",
		allowedNeedles: ["gauge_27_long_35mm", "gauge_30_medium_25mm"],
		depthMm: { min: 15, max: 20, target: 18 },
		requiresBoneContact: true,
		typicalCarpules: 1.0,
		typicalVolumeMl: 1.7,
		riskPercent: 12.5,
		riskTier: "critical_high",
		onsetMin: { min: 10, max: 15, defaultWaitTimeSec: 600 },
		pulpalMin: { min: 60, max: 90 },
		softTissueMin: { min: 180, max: 300 },
		zones: {
			teethDescRu: "Все зубы нижней челюсти квадранта (1-8)",
			quadrantRu: "Нижний квадрант",
			tongue: true,
			lip: true,
			cheek: true,
			palate: false,
			summaryRu:
				"Блокада половины нижней челюсти: зубы 1-8, 2/3 языка, половина нижней губы.",
		},
		aspirationPlanes: 2,
		recommendationsRu:
			"Обязательна аспирационная проба в 2-х плоскостях (0° и 180°). Дождаться контакта с костью.",
	}),
	mandibular_gow_gates: createTechniqueSpec({
		id: "mandibular_gow_gates",
		nameRu: "Мандибулярная блокада по Гоу-Гейтсу",
		shortNameRu: "По Гоу-Гейтсу (Gow-Gates)",
		category: "conduction_mandibular",
		landmarksRu:
			"Шейка мыщелкового отростка, мезио-язычный бугор 2-го моляра, вырезка козелка.",
		punctureRu:
			"Слизистая латеральнее крыловидно-челюстной складки на уровне 2-го моляра.",
		targetNervesRu: [
			"n. alveolaris inferior",
			"n. lingualis",
			"n. buccalis",
			"n. auriculotemporalis",
		],
		recommendedNeedle: "gauge_27_long_35mm",
		allowedNeedles: ["gauge_27_long_35mm"],
		depthMm: { min: 23, max: 27, target: 25 },
		requiresBoneContact: true,
		typicalCarpules: 1.0,
		typicalVolumeMl: 1.7,
		riskPercent: 2.0,
		riskTier: "moderate",
		onsetMin: { min: 10, max: 15, defaultWaitTimeSec: 600 },
		pulpalMin: { min: 75, max: 100 },
		softTissueMin: { min: 240, max: 360 },
		zones: {
			teethDescRu: "Все зубы квадранта (1-8)",
			quadrantRu: "Нижний квадрант",
			tongue: true,
			lip: true,
			cheek: true,
			palate: false,
			summaryRu:
				"Тотальная блокада нижнечелюстного нерва: зубы, язык, губа, щека.",
		},
		aspirationPlanes: 2,
		recommendationsRu:
			"Рот широко открыт 1-2 минуты после инъекции для депонирования раствора.",
	}),
	...MANDIBULAR_EXTRA_TECHNIQUES,
};
