/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CARL MISCH BONE DENSITY (D1–D5) CLASSIFICATION ENGINE
 * (DenCT Reverse-Engineered / Pure Clinical & Mathematical Algorithm)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * NOTE: In dental CBCT, gray values (GV) are uncalibrated and approximate
 * Hounsfield Units (HU). The ranges below represent standard clinical
 * literature thresholds for implant site osteotomy preparation.
 *
 * Misch Reference Ranges:
 *   D1: > 1250 GV (Dense cortical bone, anterior mandible)
 *   D2: 850–1250 GV (Thick dense-to-porous cortical & coarse trabecular)
 *   D3: 350–850 GV (Thin porous cortical & fine trabecular)
 *   D4: 150–350 GV (Thin fine trabecular, posterior maxilla / tuber)
 *   D5: < 150 GV (Immature, poorly mineralized bone / bone graft defect)
 */

export type MischBoneClass = "D1" | "D2" | "D3" | "D4" | "D5";

export interface MischBoneConfig {
	readonly mischClass: MischBoneClass;
	readonly classNameRu: string;
	readonly anatomicalLocationRu: string;
	readonly densityRangeRu: string;
	readonly gvMinInclusive: number;
	readonly gvMaxInclusive: number;
	readonly tactileFeelRu: string;
	readonly colorHex: string;
	readonly bgBadgeHex: string;
	readonly borderBadgeHex: string;
	readonly clinicalDescriptionRu: string;
	readonly surgicalPreparationProtocolRu: string;
	readonly recommendedTorqueNcm: {
		readonly min: number;
		readonly max: number;
		readonly target: number;
	};
	readonly healingMonths: {
		readonly mandible: number;
		readonly maxilla: number;
	};
}

export const MISCH_BONE_CONFIGS: Record<MischBoneClass, MischBoneConfig> = {
	D1: {
		mischClass: "D1",
		classNameRu: "Класс D1 — Плотная кортикальная кость",
		anatomicalLocationRu: "Передний отдел нижней челюсти (между ментальными отверстиями)",
		densityRangeRu: "> 1250 GV (HU)",
		gvMinInclusive: 1251,
		gvMaxInclusive: 3000,
		tactileFeelRu: "Дуб / слоновая кость (очень плотная древесина)",
		colorHex: "#1d4ed8", // blue-700
		bgBadgeHex: "#dbeafe",
		borderBadgeHex: "#93c5fd",
		clinicalDescriptionRu:
			"Гомогенная плотная кортикальная кость с минимальным трабекулярным пространством и скудным кровоснабжением. Чрезвычайно высокая первичная механическая фиксация, но повышенный риск термического остеонекроза при сверлении.",
		surgicalPreparationProtocolRu:
			"Полное препарирование на всю рабочую длину с калибровкой кортикальной фрезой. Обязательное нарезание резьбы метчиком (bone tap) на всю глубину на скорости 15–25 об/мин с обильным внешним и внутренним охлаждением стерильным физраствором для исключения перегрева кости выше 47°C. Рекомендуются имплантаты с мелким шагом резьбы.",
		recommendedTorqueNcm: { min: 35, max: 50, target: 40 },
		healingMonths: { mandible: 3, maxilla: 4 },
	},
	D2: {
		mischClass: "D2",
		classNameRu: "Класс D2 — Плотная пористая кортикальная и крупнопетлистая губчатая кость",
		anatomicalLocationRu: "Передний и дистальный отделы нижней челюсти, передний отдел верхней челюсти",
		densityRangeRu: "850–1250 GV (HU)",
		gvMinInclusive: 850,
		gvMaxInclusive: 1250,
		tactileFeelRu: "Сосна / белое дерево (плотная древесина средней твердости)",
		colorHex: "#047857", // emerald-700
		bgBadgeHex: "#d1fae5",
		borderBadgeHex: "#6ee7b7",
		clinicalDescriptionRu:
			"Идеальный баланс между кортикальной опорой и богатым трабекулярным кровоснабжением. Оптимальные биологические условия для быстрой остеоинтеграции и высокой первичной стабильности.",
		surgicalPreparationProtocolRu:
			"Классический ступенчатый хирургический протокол сверления с финишной фрезой номинального диаметра. Нарезание резьбы метчиком только кортикальной шейки (на 2–3 мм при выраженном кортексе). Прогноз первичной стабильности 35–45 Нсм.",
		recommendedTorqueNcm: { min: 30, max: 45, target: 35 },
		healingMonths: { mandible: 3, maxilla: 4 },
	},
	D3: {
		mischClass: "D3",
		classNameRu: "Класс D3 — Тонкая пористая кортикальная и мелкопетлистая губчатая кость",
		anatomicalLocationRu: "Передний и дистальный отделы верхней челюсти, дистальный отдел нижней челюсти",
		densityRangeRu: "350–850 GV (HU)",
		gvMinInclusive: 350,
		gvMaxInclusive: 849,
		tactileFeelRu: "Плотная бальза / фанера",
		colorHex: "#b45309", // amber-700
		bgBadgeHex: "#fef3c7",
		borderBadgeHex: "#fcd34d",
		clinicalDescriptionRu:
			"Тонкая кортикальная пластинка и умеренно пористая губчатая сердцевина. Требуется бережное формирование ложа для обеспечения торка за счет уплотнения трабекул.",
		surgicalPreparationProtocolRu:
			"Щадящее препарирование ложа: финишная фреза на 0.5–1.0 мм меньше номинального диаметра имплантата (under-drilling) для достижения бикортикальной фиксации и компрессии кости. Метчик не используется. Предпочтительны корневидные имплантаты с коническим телом и выраженным режущим профилем.",
		recommendedTorqueNcm: { min: 25, max: 35, target: 30 },
		healingMonths: { mandible: 4, maxilla: 5 },
	},
	D4: {
		mischClass: "D4",
		classNameRu: "Класс D4 — Тонкая мелкопетлистая кость низкой плотности",
		anatomicalLocationRu: "Дистальный отдел верхней челюсти (область моляров и бугра верхней челюсти)",
		densityRangeRu: "150–350 GV (HU)",
		gvMinInclusive: 150,
		gvMaxInclusive: 349,
		tactileFeelRu: "Пенопласт / мягкая бальза",
		colorHex: "#c2410c", // orange-700
		bgBadgeHex: "#ffedd5",
		borderBadgeHex: "#fdba74",
		clinicalDescriptionRu:
			"Очень тонкая кортикальная пластинка или ее отсутствие, крупнопористая губчатая ткань с низкой минерализацией. Высокий риск первичной нестабильности и провала имплантата при стандартном протоколе сверления.",
		surgicalPreparationProtocolRu:
			"Максимальное сохранение костного вещества: остеоконденсация (ручные или моторные остеотомы вместо фрез), препарирование только тонким пилотным сверлом 2.0 мм с последующим раздвижением трабекул остеотомами. Применение имплантатов с агрессивной самонарезающей резьбой (например, Osstem TSIII SA/CA, Straumann BLX). Протокол недопрепарирования ложа на 1–2 размера фрез. Бикортикальная фиксация в дно пазухи или небный кортекс.",
		recommendedTorqueNcm: { min: 20, max: 35, target: 25 },
		healingMonths: { mandible: 4, maxilla: 6 },
	},
	D5: {
		mischClass: "D5",
		classNameRu: "Класс D5 — Незрелая слабоминерализованная кость / Дефект",
		anatomicalLocationRu: "Зоны недавних удалений, свежие костные аугментаты или выраженная атрофия",
		densityRangeRu: "< 150 GV (HU)",
		gvMinInclusive: -1000,
		gvMaxInclusive: 149,
		tactileFeelRu: "Воздушный мусс / волокнистая ткань",
		colorHex: "#b91c1c", // red-700
		bgBadgeHex: "#fee2e2",
		borderBadgeHex: "#fca5a5",
		clinicalDescriptionRu:
			"Крайне низкая плотность (незрелый регенерат, остеомаляция или тяжелая остеопения). Условия для первичной стабильности стандартного дентального имплантата отсутствуют.",
		surgicalPreparationProtocolRu:
			"Установка стандартного дентального имплантата противопоказана без предварительной костной пластики (GBR) и выдержки 6–9 месяцев для минерализации, либо применение бикортикальных скуловых (Zygoma) / птеригоидных имплантатов.",
		recommendedTorqueNcm: { min: 0, max: 15, target: 10 },
		healingMonths: { mandible: 6, maxilla: 9 },
	},
};

export interface MischBoneAssessment extends MischBoneConfig {
	readonly measuredGv: number;
}

/**
 * Classifies bone density according to the Carl Misch D1–D5 classification.
 *
 * Range bounds:
 *   D1: gv > 1250
 *   D2: 850 <= gv <= 1250
 *   D3: 350 <= gv < 850
 *   D4: 150 <= gv < 350
 *   D5: gv < 150
 */
export function classifyMischBoneDensity(gv: number): MischBoneAssessment {
	let mischClass: MischBoneClass;

	if (gv > 1250) {
		mischClass = "D1";
	} else if (gv >= 850) {
		mischClass = "D2";
	} else if (gv >= 350) {
		mischClass = "D3";
	} else if (gv >= 150) {
		mischClass = "D4";
	} else {
		mischClass = "D5";
	}

	const config = MISCH_BONE_CONFIGS[mischClass];
	return {
		...config,
		measuredGv: Number(gv.toFixed(1)),
	};
}

/** Returns the static MischBoneConfig for a given Misch class. */
export function getMischClassConfig(mischClass: MischBoneClass): MischBoneConfig {
	return MISCH_BONE_CONFIGS[mischClass];
}
