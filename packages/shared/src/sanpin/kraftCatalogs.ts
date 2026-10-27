/**
 * packages/shared/src/sanpin/kraftCatalogs.ts
 * Каталог химических индикаторов и стандартных стоматологических наборов.
 * Мандат 8b: строго <= 120 строк.
 */

import type { KraftPackageSizeId } from "./kraftPackageTypes.js";

export interface ChemicalIndicatorDefinition {
	readonly id: string;
	readonly brandNameRu: string;
	readonly indicatorClass: "class_4_multivariable" | "class_5_integrator" | "class_6_emulating" | "bowie_dick";
	readonly initialColorHex?: string | undefined;
	readonly passedColorHex?: string | undefined;
	readonly initialColorRu?: string | undefined;
	readonly passedColorRu?: string | undefined;
	readonly standardTargetParamRu: string;
	readonly sanpinNormRefRu: string;
}

export const SANPIN_CHEMICAL_INDICATORS: readonly ChemicalIndicatorDefinition[] = [
	{
		id: "vinar_steritest_4",
		brandNameRu: "Винар СтериТЕСТ-П (Класс 4)",
		indicatorClass: "class_4_multivariable",
		initialColorHex: "#fb7185",
		passedColorHex: "#3b1a0e",
		initialColorRu: "Розовый",
		passedColorRu: "Темно-коричневый",
		standardTargetParamRu: "134°C / 5 мин / 2.0 бар",
		sanpinNormRefRu: "СанПиН 3.3686-21 (Многопеременный индикатор Класс 4)",
	},
	{
		id: "vinar_intetest_5",
		brandNameRu: "Винар ИнтеТЕСТ-В-134/5 (Класс 5)",
		indicatorClass: "class_5_integrator",
		initialColorHex: "#0284c7",
		passedColorHex: "#1c1917",
		initialColorRu: "Сине-зеленый",
		passedColorRu: "Черно-коричневый",
		standardTargetParamRu: "Интегратор 134°C (пар + t° + время)",
		sanpinNormRefRu: "СанПиН 3.3686-21 (Химический интегратор Класс 5 / ГОСТ ISO 11140-1)",
	},
	{
		id: "medtest_medis_4",
		brandNameRu: "Медтест МедИС-134/5 (Класс 4)",
		indicatorClass: "class_4_multivariable",
		initialColorHex: "#facc15",
		passedColorHex: "#451a03",
		initialColorRu: "Желтый",
		passedColorRu: "Коричнево-черный",
		standardTargetParamRu: "134°C / 5 мин",
		sanpinNormRefRu: "СанПиН 3.3686-21 / ГОСТ ISO 11140-1-2011",
	},
	{
		id: "medtest_is5_integrator",
		brandNameRu: "Медтест ИС-134 (Класс 5 Интеграл)",
		indicatorClass: "class_5_integrator",
		initialColorHex: "#a855f7",
		passedColorHex: "#18181b",
		initialColorRu: "Фиолетовый",
		passedColorRu: "Антрацитово-черный",
		standardTargetParamRu: "Интегратор критических параметров пара",
		sanpinNormRefRu: "СанПиН 3.3686-21 (Индикатор-интегратор пара)",
	},
];

export interface DentalToolSetDefinition {
	readonly id: string;
	readonly shortCode: string;
	readonly nameRu: string;
	readonly defaultPackageSize: KraftPackageSizeId;
	readonly typicalItemsRu: readonly string[];
}

export const DENTAL_TOOL_SETS_CATALOG: readonly DentalToolSetDefinition[] = [
	{
		id: "set_therapeutic_tray",
		shortCode: "TER-TRAY",
		nameRu: "Терапевтический лоток смотровой",
		defaultPackageSize: "size_100x200",
		typicalItemsRu: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет анатомический", "Гладилка-штопфер", "Экскаватор"],
	},
	{
		id: "set_endodontic_burs",
		shortCode: "ENDO-SET",
		nameRu: "Эндодонтический набор боров и файлов",
		defaultPackageSize: "size_75x150",
		typicalItemsRu: ["К-файлы #15-40", "Спредер", "Плаггер", "Боры эндодонтические"],
	},
	{
		id: "set_surgical_extraction",
		shortCode: "SURG-EXT",
		nameRu: "Хирургический набор для удаления",
		defaultPackageSize: "size_150x250",
		typicalItemsRu: ["Щипцы анатомические", "Элеватор прямой", "Элеватор штыковидный", "Кюретажная ложка"],
	},
	{
		id: "set_periodontal_gracey",
		shortCode: "PERIO-GRC",
		nameRu: "Набор кюрет Грейси пародонтологический",
		defaultPackageSize: "size_150x250",
		typicalItemsRu: ["Кюреты Грейси 1/2, 7/8, 11/12, 13/14", "Зонд пародонтальный ВОЗ"],
	},
	{
		id: "set_orthopedic_prep",
		shortCode: "ORTH-PREP",
		nameRu: "Ортопедический набор препарирования",
		defaultPackageSize: "size_100x200",
		typicalItemsRu: ["Наконечник турбинный", "Боры алмазные торцевые", "Ретракционная гладилка"],
	},
];

export const getChemicalIndicatorDefinition = (id: string): ChemicalIndicatorDefinition =>
	SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === id) || SANPIN_CHEMICAL_INDICATORS[0]!;

export const getDentalToolSetDefinition = (id: string): DentalToolSetDefinition =>
	DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === id || s.shortCode === id) || DENTAL_TOOL_SETS_CATALOG[0]!;
