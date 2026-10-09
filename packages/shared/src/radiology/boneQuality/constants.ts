/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT BONE QUALITY ENGINE — CONSTANTS & REFERENCE TABLES (LAYER 0)
 * ═══════════════════════════════════════════════════════════════════════════
 * Canonical clinical reference metadata, Hounsfield Unit bounds, tactile
 * textures, color badges, and Lekholm-Zarb morphological archetypes.
 *
 * 100% pure TypeScript, zero emojis, strictly professional medical nomenclature.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	MischBoneClass,
	MischClassificationInfo,
	MischGuidance,
	MischDensityProfile,
	MischBoneConfig,
	LekholmZarbType,
	LekholmZarbInfo,
} from "./types.js";

// ── Anatomical Safety Distances & Threshold Constants ──────────

export const MANDIBULAR_CANAL_SAFETY_MARGIN_MM = 1.5;
export const MAXILLARY_SINUS_SAFETY_MARGIN_MM = 1.0;
export const MENTAL_FORAMEN_SAFETY_MARGIN_MM = 2.0;
export const DEFAULT_CORTICAL_THRESHOLD_HU = 700;

// ── Carl E. Misch Classification Metadata ──────────────────────

export const MISCH_CLASSIFICATION_INFO: Record<MischBoneClass, MischClassificationInfo> = {
	D1: {
		mischClass: "D1",
		classNameRu: "Класс D1 — Плотная кортикальная кость",
		anatomicalLocationRu: "Передний отдел нижней челюсти (симфиз)",
		densityRangeRu: "> 1250 HU (GV)",
		tactileFeelRu: "Дуб / слоновая кость",
		clinicalDescriptionRu:
			"Гомогенная плотная кортикальная кость с минимальным трабекулярным пространством и скудным кровоснабжением. Чрезвычайно высокая первичная фиксация, высокий риск термического остеонекроза при сверлении.",
	},
	D2: {
		mischClass: "D2",
		classNameRu: "Класс D2 — Плотная пористая кортикальная и крупнопетлистая губчатая кость",
		anatomicalLocationRu: "Передний и боковой отделы нижней челюсти, передний отдел верхней челюсти",
		densityRangeRu: "850–1250 HU (GV)",
		tactileFeelRu: "Сосна / белое дерево",
		clinicalDescriptionRu:
			"Идеальный баланс между кортикальной опорой и богатым трабекулярным кровоснабжением. Оптимальные биологические условия для быстрой остеоинтеграции.",
	},
	D3: {
		mischClass: "D3",
		classNameRu: "Класс D3 — Тонкая пористая кортикальная и мелкопетлистая губчатая кость",
		anatomicalLocationRu: "Передний и дистальный отделы верхней челюсти, дистальный отдел нижней челюсти",
		densityRangeRu: "350–850 HU (GV)",
		tactileFeelRu: "Плотная бальза / фанера",
		clinicalDescriptionRu:
			"Тонкая кортикальная пластинка и умеренно пористая губчатая сердцевина. Требуется бережное формирование ложа для обеспечения торка за счет уплотнения трабекул.",
	},
	D4: {
		mischClass: "D4",
		classNameRu: "Класс D4 — Тонкая мелкопетлистая кость низкой плотности",
		anatomicalLocationRu: "Дистальный отдел верхней челюсти (область моляров и бугра)",
		densityRangeRu: "150–350 HU (GV)",
		tactileFeelRu: "Пенопласт / мягкая бальза",
		clinicalDescriptionRu:
			"Очень тонкая кортикальная пластинка или ее отсутствие, крупнопористая губчатая ткань с низкой минерализацией. Высокий риск первичной нестабильности при стандартном сверлении.",
	},
	D5: {
		mischClass: "D5",
		classNameRu: "Класс D5 — Незрелая слабоминерализованная кость / Дефект",
		anatomicalLocationRu: "Зоны недавних удалений, свежие аугментаты или выраженная атрофия",
		densityRangeRu: "< 150 HU (GV)",
		tactileFeelRu: "Воздушный мусс / фиброзная ткань",
		clinicalDescriptionRu:
			"Крайне низкая плотность. Условия для первичной стабильности стандартного дентального имплантата отсутствуют без предварительной реконструктивной пластики.",
	},
};

export const MISCH_CLINICAL_GUIDANCE: Record<MischBoneClass, MischGuidance> = {
	D1: {
		boneClass: "D1",
		classNameRu: "Класс D1 — Плотная кортикальная кость",
		densityRangeRu: "> 1250 HU (GV)",
		anatomicLocationRu:
			"Передний отдел нижней челюсти (между ментальными отверстиями / симфиз)",
		corticalDescriptionRu: "Плотная гомогенная кортикальная кость («кость дуба»)",
		trabecularDescriptionRu:
			"Практически отсутствует, минимальные костномозговые пространства",
		tactileFeelRu: "Дуб / слоновая кость (очень плотная древесина)",
		clinicalDescriptionRu:
			"Гомогенная плотная кортикальная кость с минимальным трабекулярным пространством и скудным кровоснабжением. Чрезвычайно высокая первичная механическая фиксация, но повышенный риск термического остеонекроза при сверлении.",
		surgicalPreparationProtocolRu:
			"Полное препарирование на всю рабочую длину с калибровкой кортикальной фрезой. Обязательное нарезание резьбы метчиком (bone tap) на всю глубину на скорости 15–25 об/мин с обильным внешним и внутренним охлаждением стерильным физраствором для исключения перегрева кости выше 47°C. Рекомендуются имплантаты с мелким шагом резьбы.",
		drillingProtocolRu:
			"Полное препарирование ложа, нарезание резьбы метчиком на всю глубину, обильное охлаждение для защиты от термонекроза",
		recommendedTorqueNcm: { min: 35, max: 50, target: 40 },
		healingMonths: { mandible: 3, maxilla: 4 },
		colorHex: "#1d4ed8",
		bgBadgeHex: "#dbeafe",
		borderBadgeHex: "#93c5fd",
	},
	D2: {
		boneClass: "D2",
		classNameRu:
			"Класс D2 — Плотная пористая кортикальная и крупнопетлистая губчатая кость",
		densityRangeRu: "850–1250 HU (GV)",
		anatomicLocationRu:
			"Передний и боковой отделы нижней челюсти, передний отдел верхней челюсти",
		corticalDescriptionRu: "Выраженная плотная кортикальная пластинка",
		trabecularDescriptionRu: "Плотная губчатая кость с высокой минерализацией",
		tactileFeelRu: "Сосна / белое дерево (плотная древесина средней твердости)",
		clinicalDescriptionRu:
			"Идеальный баланс между кортикальной опорой и богатым трабекулярным кровоснабжением. Оптимальные биологические условия для быстрой остеоинтеграции и высокой первичной стабильности.",
		surgicalPreparationProtocolRu:
			"Классический ступенчатый хирургический протокол сверления с финишной фрезой номинального диаметра. Нарезание резьбы метчиком только кортикальной шейки (на 2–3 мм при выраженном кортексе). Прогноз первичной стабильности 35–45 Н·см.",
		drillingProtocolRu:
			"Стандартный ступенчатый протокол, метчик только при плотной кортикальной пластинке в области шейки",
		recommendedTorqueNcm: { min: 30, max: 45, target: 35 },
		healingMonths: { mandible: 3, maxilla: 4 },
		colorHex: "#047857",
		bgBadgeHex: "#d1fae5",
		borderBadgeHex: "#6ee7b7",
	},
	D3: {
		boneClass: "D3",
		classNameRu:
			"Класс D3 — Тонкая пористая кортикальная и мелкопетлистая губчатая кость",
		densityRangeRu: "350–850 HU (GV)",
		anatomicLocationRu:
			"Передний и дистальный отделы верхней челюсти, дистальный отдел нижней челюсти",
		corticalDescriptionRu: "Тонкая пористая кортикальная пластинка",
		trabecularDescriptionRu: "Мелкоячеистая губчатая кость средней плотности",
		tactileFeelRu: "Плотная бальза / фанера",
		clinicalDescriptionRu:
			"Тонкая кортикальная пластинка и умеренно пористая губчатая сердцевина. Требуется бережное формирование ложа для обеспечения торка за счет уплотнения трабекул.",
		surgicalPreparationProtocolRu:
			"Щадящее препарирование ложа: финишная фреза на 0.5–1.0 мм меньше номинального диаметра имплантата (under-drilling) для достижения бикортикальной фиксации и компрессии кости. Метчик не используется. Предпочтительны корневидные имплантаты с коническим телом и выраженным режущим профилем.",
		drillingProtocolRu:
			"Протокол недопрепарирования (under-drilling) на 0.5–1.0 мм меньше диаметра имплантата для остеоконденсации",
		recommendedTorqueNcm: { min: 25, max: 35, target: 30 },
		healingMonths: { mandible: 4, maxilla: 5 },
		colorHex: "#b45309",
		bgBadgeHex: "#fef3c7",
		borderBadgeHex: "#fcd34d",
	},
	D4: {
		boneClass: "D4",
		classNameRu: "Класс D4 — Тонкая мелкопетлистая кость низкой плотности",
		densityRangeRu: "150–350 HU (GV)",
		anatomicLocationRu:
			"Дистальный отдел верхней челюсти (область моляров и бугра верхней челюсти)",
		corticalDescriptionRu: "Практически отсутствует",
		trabecularDescriptionRu:
			"Крупноячеистая редкая губчатая кость низкой плотности («пенопласт»)",
		tactileFeelRu: "Пенопласт / мягкая бальза",
		clinicalDescriptionRu:
			"Очень тонкая кортикальная пластинка или ее отсутствие, крупнопористая губчатая ткань с низкой минерализацией. Высокий риск первичной нестабильности и провала имплантата при стандартном протоколе сверления.",
		surgicalPreparationProtocolRu:
			"Максимальное сохранение костного вещества: остеоконденсация (ручные или моторные остеотомы вместо фрез), препарирование только тонким пилотным сверлом 2.0 мм с последующим раздвижением трабекул остеотомами. Применение имплантатов с агрессивной самонарезающей резьбой. Протокол недопрепарирования ложа на 1–2 размера фрез. Бикортикальная фиксация в дно пазухи или небный кортекс.",
		drillingProtocolRu:
			"Остеотомический протокол с биконденсацией кости, конусный имплантат с агрессивной резьбой, без финишных фрез",
		recommendedTorqueNcm: { min: 15, max: 25, target: 20 },
		healingMonths: { mandible: 4, maxilla: 6 },
		colorHex: "#c2410c",
		bgBadgeHex: "#ffedd5",
		borderBadgeHex: "#fdba74",
	},
	D5: {
		boneClass: "D5",
		classNameRu: "Класс D5 — Незрелая слабоминерализованная кость / Дефект",
		densityRangeRu: "< 150 HU (GV)",
		anatomicLocationRu:
			"Зоны недавних удалений, свежие костные аугментаты или выраженная атрофия",
		corticalDescriptionRu: "Отсутствует",
		trabecularDescriptionRu:
			"Незрелая неминерализованная кость или фиброзная ткань",
		tactileFeelRu: "Воздушный мусс / волокнистая ткань",
		clinicalDescriptionRu:
			"Крайне низкая плотность (незрелый регенерат, остеомаляция или тяжелая остеопения). Условия для первичной стабильности стандартного дентального имплантата отсутствуют.",
		surgicalPreparationProtocolRu:
			"Установка стандартного дентального имплантата противопоказана без предварительной костной пластики (GBR) и выдержки 6–9 месяцев для минерализации, либо применение бикортикальных скуловых (Zygoma) / птеригоидных имплантатов.",
		drillingProtocolRu:
			"Прямая имплантация противопоказана без предварительной костной пластики (GBR / аугментация)",
		recommendedTorqueNcm: { min: 0, max: 15, target: 10 },
		healingMonths: { mandible: 6, maxilla: 9 },
		colorHex: "#b91c1c",
		bgBadgeHex: "#fee2e2",
		borderBadgeHex: "#fca5a5",
	},
};

export const MISCH_BONE_PROFILES: Record<MischBoneClass, MischDensityProfile> = {
	D1: {
		boneClass: "D1",
		minHU: 1250,
		maxHU: 3000,
		anatomicLocation: "Передний отдел нижней челюсти (симфиз)",
		corticalDescription: "Плотная гомогенная кортикальная кость («кость дуба»)",
		trabecularDescription: "Практически отсутствует, минимальные костномозговые пространства",
		drillingProtocol: "Полное препарирование ложа, нарезание резьбы метчиком на всю глубину, обильное охлаждение для защиты от термонекроза",
		expectedTorqueNcm: "45–60 Н·см",
		recommendedHealingMonths: 3,
	},
	D2: {
		boneClass: "D2",
		minHU: 850,
		maxHU: 1250,
		anatomicLocation: "Передний и боковой отделы нижней челюсти, передний отдел верхней челюсти",
		corticalDescription: "Выраженная плотная кортикальная пластинка",
		trabecularDescription: "Плотная губчатая кость с высокой минерализацией",
		drillingProtocol: "Стандартный хирургический протокол, метчик при плотной кортикальной пластинке в области шейки",
		expectedTorqueNcm: "35–45 Н·см",
		recommendedHealingMonths: 3,
	},
	D3: {
		boneClass: "D3",
		minHU: 350,
		maxHU: 850,
		anatomicLocation: "Боковые отделы верхней и нижней челюсти",
		corticalDescription: "Тонкая пористая кортикальная пластинка",
		trabecularDescription: "Мелкоячеистая губчатая кость средней плотности",
		drillingProtocol: "Протокол недопрепарирования (under-drilling) на 0.5 мм тоньше диаметра имплантата для остеоконденсации",
		expectedTorqueNcm: "25–35 Н·см",
		recommendedHealingMonths: 4,
	},
	D4: {
		boneClass: "D4",
		minHU: 150,
		maxHU: 350,
		anatomicLocation: "Задний отдел верхней челюсти (бугор верхней челюсти)",
		corticalDescription: "Практически отсутствует",
		trabecularDescription: "Крупноячеистая редкая губчатая кость низкой плотности («пенопласт»)",
		drillingProtocol: "Остеотомический протокол с биконденсацией кости, конусный имплантат с агрессивной резьбой, без финишных фрез",
		expectedTorqueNcm: "15–25 Н·см",
		recommendedHealingMonths: 6,
	},
	D5: {
		boneClass: "D5",
		minHU: -1000,
		maxHU: 150,
		anatomicLocation: "Зоны недавнего удаления, выраженной атрофии или кистозных полостей",
		corticalDescription: "Отсутствует",
		trabecularDescription: "Незрелая неминерализованная кость или фиброзная ткань",
		drillingProtocol: "Прямая имплантация противопоказана без предварительной костной пластики (GBR / аугментация)",
		expectedTorqueNcm: "< 15 Н·см (первичная стабильность не гарантирована)",
		recommendedHealingMonths: 6,
	},
};

export const MISCH_BONE_CONFIGS: Record<MischBoneClass, MischBoneConfig> = {
	D1: {
		mischClass: "D1",
		classNameRu: "Класс D1 — Плотная кортикальная кость",
		anatomicalLocationRu: "Передний отдел нижней челюсти (между ментальными отверстиями)",
		densityRangeRu: "> 1250 GV (HU)",
		gvMinInclusive: 1251,
		gvMaxInclusive: 3000,
		tactileFeelRu: "Дуб / слоновая кость",
		colorHex: "#1d4ed8",
		bgBadgeHex: "#dbeafe",
		borderBadgeHex: "#93c5fd",
		clinicalDescriptionRu:
			"Гомогенная плотная кортикальная кость с минимальным трабекулярным кровоснабжением. Опасность термического ожога кости при препарировании ложа.",
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
		colorHex: "#047857",
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
		colorHex: "#b45309",
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
		colorHex: "#c2410c",
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
		colorHex: "#b91c1c",
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

// ── Lekholm & Zarb Classification Metadata ─────────────────────

export const LEKHOLM_ZARB_INFO: Record<LekholmZarbType, LekholmZarbInfo> = {
	Type_I: {
		type: "Type_I",
		nameRu: "Тип I — Гомогенная компактная кость",
		descriptionRu: "Практически вся челюсть состоит из плотной компактной кости.",
		morphologyRu: "Гомогенный кортекс без выраженного губчатого вещества.",
	},
	Type_II: {
		type: "Type_II",
		nameRu: "Тип II — Толстый кортикальный слой вокруг плотной губчатой кости",
		descriptionRu: "Толстый слой компактной кости окружает плотную губчатую сердцевину.",
		morphologyRu: "Кортикальный слой >= 1.5 мм, плотные трабекулы.",
	},
	Type_III: {
		type: "Type_III",
		nameRu: "Тип III — Тонкий кортикальный слой вокруг плотной губчатой кости",
		descriptionRu: "Тонкий слой компактной кости окружает плотную губчатую сердцевину достаточной прочности.",
		morphologyRu: "Кортикальный слой < 1.5 мм, губчатая кость нормальной плотности.",
	},
	Type_IV: {
		type: "Type_IV",
		nameRu: "Тип IV — Тонкий кортикальный слой вокруг разреженной губчатой кости",
		descriptionRu: "Тонкий слой компактной кости окружает рыхлую низкоминерализованную губчатую кость.",
		morphologyRu: "Кортикальный слой < 1.5 мм, крупнопористая трабекулярная сеть.",
	},
};
