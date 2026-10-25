/**
 * apps/web/src/components/sanpin/kraft/chemicalIntegratorsClass6.ts
 * Химические индикаторы-эмуляторы 6 класса. Мандат 8b: строго <= 120 строк.
 */

import type { ChemicalIntegratorDefinition } from "./chemicalIntegratorsTypes.js";

export const CHEMICAL_INTEGRATORS_CLASS_6: readonly ChemicalIntegratorDefinition[] = [
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
		sanpinNormClauseRu: "Эмулятор 134°C / 5 мин",
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
		sanpinNormClauseRu: "Эмулятор 134°C / 5 мин",
	},
];
