/**
 * apps/web/src/components/sanpin/kraft/chemicalIntegratorsCatalog.ts
 *
 * Каталог химических индикаторов и интеграторов (СанПиН 3.3686-21, ГОСТ ISO 11140-1).
 * Классы 4, 5 и 6, нормативные эталоны и функции оценки.
 */

import type { SterilizationRegimeId } from "@dental/shared";

export type ChemicalIndicatorClassType = "class_4" | "class_5" | "class_6";

export interface ChemicalIntegratorDefinition {
	readonly id: string;
	readonly code: string;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly brandRu: string;
	readonly manufacturerRu: string;
	readonly classType: ChemicalIndicatorClassType;
	readonly classLabelRu: string;
	readonly regimeId: SterilizationRegimeId;
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly initialColorHex: string;
	readonly initialColorNameRu: string;
	readonly targetColorHex: string;
	readonly targetColorNameRu: string;
	readonly placementLocationRu: string;
	readonly interpretationRuleRu: string;
	readonly isCriticalSurgeryRecommended: boolean;
	readonly sanpinNormClauseRu: string;
}

export const CHEMICAL_INTEGRATORS_CATALOG: readonly ChemicalIntegratorDefinition[] = [
	// Класс 4 — многопеременные индикаторы
	{
		id: "vinar_steritest_4_134",
		code: "СТ-134-4",
		nameRu: "СтериТЕСТ-В 134/5 (Класс 4)",
		shortLabelRu: "СтериТЕСТ-В 134/5 (Кл. 4)",
		brandRu: "СтериТЕСТ-В",
		manufacturerRu: "НПФ «Винар»",
		classType: "class_4",
		classLabelRu: "Класс 4",
		regimeId: "steam_134_5min",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.05,
		targetExposureMinutes: 5,
		initialColorHex: "#fb7185",
		initialColorNameRu: "Светло-розовый",
		targetColorHex: "#3b1a0e",
		targetColorNameRu: "Темно-коричневый",
		placementLocationRu: "Внутри крафт-пакета",
		interpretationRuleRu: "Совпадает с эталоном или темнее его.",
		isCriticalSurgeryRecommended: false,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
	},
	{
		id: "vinar_steritest_4_121",
		code: "СТ-121-4",
		nameRu: "СтериТЕСТ-В 121/20 (Класс 4)",
		shortLabelRu: "СтериТЕСТ-В 121/20 (Кл. 4)",
		brandRu: "СтериТЕСТ-В",
		manufacturerRu: "НПФ «Винар»",
		classType: "class_4",
		classLabelRu: "Класс 4",
		regimeId: "steam_121_20min",
		targetTemperatureCelsius: 121,
		targetPressureBar: 1.15,
		targetExposureMinutes: 20,
		initialColorHex: "#c084fc",
		initialColorNameRu: "Фиолетовый",
		targetColorHex: "#14532d",
		targetColorNameRu: "Темно-зеленый",
		placementLocationRu: "Внутри пакетов",
		interpretationRuleRu: "Переход в темно-зеленый цвет.",
		isCriticalSurgeryRecommended: false,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 2)",
	},
	{
		id: "vinar_steritest_4_180",
		code: "СТ-180-4",
		nameRu: "СтериТЕСТ-Г 180/60 (Класс 4)",
		shortLabelRu: "СтериТЕСТ-Г 180/60 (Кл. 4)",
		brandRu: "СтериТЕСТ-Г",
		manufacturerRu: "НПФ «Винар»",
		classType: "class_4",
		classLabelRu: "Класс 4",
		regimeId: "dry_heat_180_60min",
		targetTemperatureCelsius: 180,
		targetPressureBar: 0,
		targetExposureMinutes: 60,
		initialColorHex: "#fde047",
		initialColorNameRu: "Желтый",
		targetColorHex: "#3b1a0e",
		targetColorNameRu: "Коричневый",
		placementLocationRu: "Внутри камеры сухожара",
		interpretationRuleRu: "Потемнение до коричневого цвета.",
		isCriticalSurgeryRecommended: false,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
	},
	{
		id: "bmt_steripoint_4_134",
		code: "СП-134-4",
		nameRu: "СтериПойнт 134/5 (Класс 4)",
		shortLabelRu: "СтериПойнт 134/5 (Кл. 4)",
		brandRu: "СтериПойнт",
		manufacturerRu: "BMT Medical",
		classType: "class_4",
		classLabelRu: "Класс 4",
		regimeId: "steam_134_5min",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.05,
		targetExposureMinutes: 5,
		initialColorHex: "#fca5a5",
		initialColorNameRu: "Розовый",
		targetColorHex: "#1c1917",
		targetColorNameRu: "Черный",
		placementLocationRu: "Контрольные точки",
		interpretationRuleRu: "Переход в черный цвет.",
		isCriticalSurgeryRecommended: false,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
	},
	// Класс 5 — интеграторы
	{
		id: "vinar_inte_test_5_134",
		code: "ИНТ-134-5",
		nameRu: "ИнтеТЕСТ-В 134/5 (Класс 5)",
		shortLabelRu: "ИнтеТЕСТ-В 134/5 (Кл. 5)",
		brandRu: "ИнтеТЕСТ",
		manufacturerRu: "НПФ «Винар»",
		classType: "class_5",
		classLabelRu: "Класс 5",
		regimeId: "steam_134_5min",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.05,
		targetExposureMinutes: 5,
		initialColorHex: "#d4b896",
		initialColorNameRu: "Бежевый",
		targetColorHex: "#3e2723",
		targetColorNameRu: "Темно-коричневый",
		placementLocationRu: "Внутри критических наборов",
		interpretationRuleRu: "Цвет сравнения темно-коричневый.",
		isCriticalSurgeryRecommended: true,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
	},
	{
		id: "vinar_intetest_5_132_20",
		code: "ИНТ-132-5",
		nameRu: "ИнтеТЕСТ-В 132/20 (Класс 5)",
		shortLabelRu: "ИнтеТЕСТ-В 132/20 (Кл. 5)",
		brandRu: "ИнтеТЕСТ",
		manufacturerRu: "НПФ «Винар»",
		classType: "class_5",
		classLabelRu: "Класс 5",
		regimeId: "steam_132_20min",
		targetTemperatureCelsius: 132,
		targetPressureBar: 2.0,
		targetExposureMinutes: 20,
		initialColorHex: "#d4b896",
		initialColorNameRu: "Бежевый",
		targetColorHex: "#3e2723",
		targetColorNameRu: "Темно-коричневый",
		placementLocationRu: "Внутри критических наборов",
		interpretationRuleRu: "Цвет сравнения темно-коричневый.",
		isCriticalSurgeryRecommended: true,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
	},
	{
		id: "medtest_integrator_5_134",
		code: "МТ-134-5",
		nameRu: "Медтест Интегратор 134/5 (Класс 5)",
		shortLabelRu: "Медтест 134/5 (Кл. 5)",
		brandRu: "Медтест",
		manufacturerRu: "ООО «Медтест»",
		classType: "class_5",
		classLabelRu: "Класс 5",
		regimeId: "steam_134_5min",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.05,
		targetExposureMinutes: 5,
		initialColorHex: "#e2e8f0",
		initialColorNameRu: "Белый",
		targetColorHex: "#1e293b",
		targetColorNameRu: "Темно-серый",
		placementLocationRu: "Внутри полостей инструментов",
		interpretationRuleRu: "Сравнение с эталонной полосой.",
		isCriticalSurgeryRecommended: true,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
	},
	{
		id: "vinar_inte_test_5_180",
		code: "ИНТ-180-5",
		nameRu: "ИнтеТЕСТ-Г 180/60 (Класс 5)",
		shortLabelRu: "ИнтеТЕСТ-Г 180/60 (Кл. 5)",
		brandRu: "ИнтеТЕСТ",
		manufacturerRu: "НПФ «Винар»",
		classType: "class_5",
		classLabelRu: "Класс 5",
		regimeId: "dry_heat_180_60min",
		targetTemperatureCelsius: 180,
		targetPressureBar: 0,
		targetExposureMinutes: 60,
		initialColorHex: "#fed7aa",
		initialColorNameRu: "Оранжевый",
		targetColorHex: "#451a03",
		targetColorNameRu: "Темно-коричневый",
		placementLocationRu: "Внутри сухожаровых пакетов",
		interpretationRuleRu: "Сравнение с эталоном темно-коричневого цвета.",
		isCriticalSurgeryRecommended: true,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
	},
	// Класс 6 — эмуляторы
	{
		id: "vinar_emutest_6_134",
		code: "ЭМУ-134-6",
		nameRu: "ЭмуТЕСТ-В 134/5 (Класс 6)",
		shortLabelRu: "ЭмуТЕСТ-В 134/5 (Кл. 6)",
		brandRu: "ЭмуТЕСТ",
		manufacturerRu: "НПФ «Винар»",
		classType: "class_6",
		classLabelRu: "Класс 6",
		regimeId: "steam_134_5min",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.05,
		targetExposureMinutes: 5,
		initialColorHex: "#fde047",
		initialColorNameRu: "Желтый",
		targetColorHex: "#1e1b4b",
		targetColorNameRu: "Темно-фиолетовый",
		placementLocationRu: "Имплантологические кассеты",
		interpretationRuleRu: "Переход в темно-фиолетовый цвет.",
		isCriticalSurgeryRecommended: true,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
	},
	{
		id: "medtest_emutest_6_134",
		code: "МТ-134-6",
		nameRu: "Медтест Эмуляционный 134/5 (Класс 6)",
		shortLabelRu: "Медтест Эму 134/5 (Кл. 6)",
		brandRu: "Медтест",
		manufacturerRu: "ООО «Медтест»",
		classType: "class_6",
		classLabelRu: "Класс 6",
		regimeId: "steam_134_5min",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.05,
		targetExposureMinutes: 5,
		initialColorHex: "#fef08a",
		initialColorNameRu: "Лимонный",
		targetColorHex: "#0f172a",
		targetColorNameRu: "Иссиня-черный",
		placementLocationRu: "Критическая хирургия",
		interpretationRuleRu: "Достижение контрольного черного тона.",
		isCriticalSurgeryRecommended: true,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
	},
];

export type VisualIndicatorMatchState =
	| "match_reference"
	| "darker_than_reference"
	| "lighter_than_reference"
	| "unchanged_initial";

export interface IntegratorEvaluationResult {
	readonly isValid: boolean;
	readonly integrator: ChemicalIntegratorDefinition;
	readonly matchState: VisualIndicatorMatchState;
	readonly verdictRu: string;
	readonly statusColorHex: string;
	readonly allowsClinicalUse: boolean;
	readonly protocolNoteRu: string;
}

export function getAllChemicalIntegrators(): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG;
}

export function getChemicalIntegratorById(id: string): ChemicalIntegratorDefinition | undefined {
	return CHEMICAL_INTEGRATORS_CATALOG.find((c) => c.id === id || c.code === id);
}

export function getChemicalIntegratorsByClass(classType: ChemicalIndicatorClassType): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG.filter((c) => c.classType === classType);
}

export function getChemicalIntegratorsByRegime(regimeId: SterilizationRegimeId): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG.filter((c) => c.regimeId === regimeId);
}

export function evaluateChemicalIntegratorColorMatch(
	integratorId: string,
	matchState: VisualIndicatorMatchState,
): IntegratorEvaluationResult {
	const integrator = getChemicalIntegratorById(integratorId) || CHEMICAL_INTEGRATORS_CATALOG[0]!;
	const isPass = matchState === "match_reference" || matchState === "darker_than_reference";

	return {
		isValid: isPass,
		integrator,
		matchState,
		statusColorHex: isPass ? "#10b981" : matchState === "lighter_than_reference" ? "#f59e0b" : "#ef4444",
		allowsClinicalUse: isPass,
		verdictRu: isPass
			? `Цвет метки соответствует эталону (${integrator.targetColorNameRu}). Стерилизация подтверждена.`
			: matchState === "unchanged_initial"
				? `КРИТИЧЕСКИЙ БРАК: Цвет метки не изменился (${integrator.initialColorNameRu}). Цикл не пройден.`
				: `БРАК: Цвет метки не соответствует эталону. Использование запрещено.`,
		protocolNoteRu: isPass
			? `Хим. контроль (${integrator.shortLabelRu}): СООТВЕТСТВУЕТ ЭТАЛОНУ. Допущен.`
			: `Хим. контроль (${integrator.shortLabelRu}): БРАК. Забраковано.`,
	};
}

export function getRecommendedIntegrator(
	regimeId: SterilizationRegimeId,
	options?: { forCriticalSurgery?: boolean; preferredClass?: ChemicalIndicatorClassType },
): ChemicalIntegratorDefinition {
	const candidates = getChemicalIntegratorsByRegime(regimeId);
	if (candidates.length === 0) return CHEMICAL_INTEGRATORS_CATALOG[0]!;

	if (options?.preferredClass) {
		const byClass = candidates.find((c) => c.classType === options.preferredClass);
		if (byClass) return byClass;
	}

	if (options?.forCriticalSurgery) {
		const class6 = candidates.find((c) => c.classType === "class_6");
		if (class6) return class6;
		const class5 = candidates.find((c) => c.classType === "class_5");
		if (class5) return class5;
	}

	return candidates[0]!;
}
