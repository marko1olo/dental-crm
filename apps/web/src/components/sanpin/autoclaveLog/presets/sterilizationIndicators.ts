import type { SterilizationRegimeId } from "./sterilizersCatalog";

export { type BioIndicatorDefinition, STATUTORY_BIO_INDICATORS } from "./bioIndicators";

export interface ChemicalIndicatorDefinition {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly manufacturerRu: string;
	readonly indicatorClass: 4 | 5 | 6 | 2;
	readonly indicatorTypeDescriptionRu: string;
	readonly suitableRegimeIds: readonly SterilizationRegimeId[];
	readonly initialColorRu: string;
	readonly passedColorRu: string;
	readonly failedColorRu: string;
	readonly initialColorHex: string;
	readonly passedColorHex: string;
	readonly failedColorHex: string;
	readonly inspectionStandardRu: string;
}

export const STATUTORY_CHEMICAL_INDICATORS: readonly ChemicalIndicatorDefinition[] = [
	{
		id: "steritest_v_134", tradeNameRu: "СтериТЕСТ-В-134 (Винар)", manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 4, indicatorTypeDescriptionRu: "Многопеременный химический индикатор 4 класса",
		suitableRegimeIds: ["steam_134_5min", "steam_134_20min_prion"],
		initialColorRu: "Сине-зеленый", passedColorRu: "Темно-коричневый / черный",
		failedColorRu: "Светло-коричневый или зеленый (неполный переход)",
		initialColorHex: "#0ea5e9", passedColorHex: "#3e2723", failedColorHex: "#84cc16",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011 (Класс 4)",
	},
	{
		id: "intetest_v_134_5", tradeNameRu: "ИнтеТЕСТ-В-134/5 (Винар)", manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 5, indicatorTypeDescriptionRu: "Интегрирующий индикатор 5 класса (пар + T + t)",
		suitableRegimeIds: ["steam_134_5min", "steam_134_20min_prion"],
		initialColorRu: "Фиолетовый", passedColorRu: "Ярко-зеленый (точное соответствие)",
		failedColorRu: "Грязно-синий или пурпурный",
		initialColorHex: "#8b5cf6", passedColorHex: "#10b981", failedColorHex: "#ef4444",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011 (Класс 5 Интегратор)",
	},
	{
		id: "steritest_v_121", tradeNameRu: "СтериТЕСТ-В-121 (Винар)", manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 4, indicatorTypeDescriptionRu: "Химический индикатор 4 класса для 121°C",
		suitableRegimeIds: ["steam_121_20min"],
		initialColorRu: "Розово-красный", passedColorRu: "Темно-коричневый",
		failedColorRu: "Оранжевый / светло-красный",
		initialColorHex: "#f43f5e", passedColorHex: "#451a03", failedColorHex: "#fb923c",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011 (Класс 4)",
	},
	{
		id: "medis_180", tradeNameRu: "МедИС-180 (Медтест)", manufacturerRu: "ООО «Медтест-СПб», Россия",
		indicatorClass: 4, indicatorTypeDescriptionRu: "Химический индикатор 4 класса для сухожара (180°C)",
		suitableRegimeIds: ["dry_heat_180_60min"],
		initialColorRu: "Синий", passedColorRu: "Коричневый / темно-коричневый", failedColorRu: "Серо-синий",
		initialColorHex: "#2563eb", passedColorHex: "#3f2c22", failedColorHex: "#64748b",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011",
	},
	{
		id: "bowie_dick_vinar_sheet", tradeNameRu: "Тест-пакет Бови-Дик-ВИНАР", manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 2, indicatorTypeDescriptionRu: "Тест-лист 2 класса для контроля удаления воздуха",
		suitableRegimeIds: ["bowie_dick_test"],
		initialColorRu: "Желтый с рисунком", passedColorRu: "Равномерно черный по всей площади",
		failedColorRu: "Светло-желтое пятно в центре (пузырь)",
		initialColorHex: "#eab308", passedColorHex: "#09090b", failedColorHex: "#f59e0b",
		inspectionStandardRu: "ГОСТ ISO 11140-4",
	},
	{
		id: "vinar_emu_6_134", tradeNameRu: "ЭМУ-134/5 Индикатор Класс 6 (Винар)", manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 6, indicatorTypeDescriptionRu: "Эмулирующий химический индикатор 6 класса",
		suitableRegimeIds: ["steam_134_5min", "steam_134_20min_prion"],
		initialColorRu: "Ярко-пурпурный", passedColorRu: "Темно-зеленый (изумрудно-черный эталон)",
		failedColorRu: "Фиолетовый (недостижение 100% времени)",
		initialColorHex: "#e879f9", passedColorHex: "#064e3b", failedColorHex: "#d946ef",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011 (Класс 6 Эмулятор)",
	},
	{
		id: "dgm_steriguard_6", tradeNameRu: "DGM Steriguard 6 Эмулятор", manufacturerRu: "DGM Pharma-Apparate Handel AG",
		indicatorClass: 6, indicatorTypeDescriptionRu: "Химический эмулятор 6 класса (134°C / 5.3 мин)",
		suitableRegimeIds: ["steam_134_5min", "steam_134_20min_prion"],
		initialColorRu: "Желтый", passedColorRu: "Фиолетово-черный",
		failedColorRu: "Светло-коричневый (сбой интеграции)",
		initialColorHex: "#eab308", passedColorHex: "#18181b", failedColorHex: "#b45309",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011 (Класс 6)",
	},
];
