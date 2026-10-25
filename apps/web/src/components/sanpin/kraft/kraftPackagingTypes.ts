/**
 * apps/web/src/components/sanpin/kraft/kraftPackagingTypes.ts
 * Каталог упаковочных материалов для стерилизации. Мандат 8b: строго <= 120 строк.
 */

export type SanpinPackagingTypeId =
	| "kraft_self_seal" | "paper_plastic_heat_seal" | "crepe_paper_double"
	| "bix_filter" | "bix_no_filter" | "calico_double_wrap";

export interface SanpinPackagingTypeDefinition {
	readonly id: SanpinPackagingTypeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly minShelfLifeDays: number;
	readonly maxShelfLifeDays: number;
	readonly defaultShelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly sanpinClauseRu: string;
	readonly gostStandardRu: string;
	readonly descriptionRu: string;
	readonly storageRequirementsRu: string;
	readonly isHeatSealed: boolean;
	readonly isTransparentFilm: boolean;
}

export const SANPIN_PACKAGING_TYPES: readonly SanpinPackagingTypeDefinition[] = [
	{
		id: "kraft_self_seal",
		nameRu: "Крафт-пакет бумажный самоклеящийся",
		shortLabelRu: "Крафт-пакет самоклеящийся (20–50 сут.)",
		minShelfLifeDays: 20,
		maxShelfLifeDays: 50,
		defaultShelfLifeDays: 50,
		sealingMethodRu: "Встроенный клеевой клапан",
		sanpinClauseRu: "СанПиН 3.3686-21 Таблица 3.14 (до 50 суток)",
		gostStandardRu: "Медицинская крафт-бумага",
		descriptionRu: "Пакет из влагопрочной крафт-бумаги.",
		storageRequirementsRu: "В сухих закрытых шкафах.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "paper_plastic_heat_seal",
		nameRu: "Комбинированный пакет термосварной (бумага + пленка)",
		shortLabelRu: "Комби-пакет термосварной (50–180 сут.)",
		minShelfLifeDays: 50,
		maxShelfLifeDays: 180,
		defaultShelfLifeDays: 60,
		sealingMethodRu: "Термосварочный аппарат (шов ≥ 8 мм)",
		sanpinClauseRu: "СанПиН 3.3686-21 Таблица 3.14 (до 180 суток)",
		gostStandardRu: "Полимер + бумага",
		descriptionRu: "Прозрачная пленка и бумага.",
		storageRequirementsRu: "В шкафах, защита от солнца.",
		isHeatSealed: true,
		isTransparentFilm: true,
	},
	{
		id: "crepe_paper_double",
		nameRu: "Крепированная бумага (упаковка в 2 слоя)",
		shortLabelRu: "Креп-бумага 2 слоя (60 сут.)",
		minShelfLifeDays: 60,
		maxShelfLifeDays: 60,
		defaultShelfLifeDays: 60,
		sealingMethodRu: "Конвертом в 2 слоя с индикаторным скотчем",
		sanpinClauseRu: "СанПиН 3.3686-21 Таблица 3.14 (60 суток)",
		gostStandardRu: "Медицинский креп",
		descriptionRu: "Крепированная бумага для наборов.",
		storageRequirementsRu: "В закрытых шкафах.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "bix_filter",
		nameRu: "Стерилизационная коробка (бикс) с фильтром",
		shortLabelRu: "Бикс с фильтром (20–30 сут.)",
		minShelfLifeDays: 20,
		maxShelfLifeDays: 30,
		defaultShelfLifeDays: 20,
		sealingMethodRu: "Герметичная крышка с фильтром",
		sanpinClauseRu: "СанПиН 3.3686-21 Таблица 3.14 (20–30 суток)",
		gostStandardRu: "Коробка КФ",
		descriptionRu: "Металлическая коробка с фильтром.",
		storageRequirementsRu: "В чистой зоне.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "bix_no_filter",
		nameRu: "Стерилизационная коробка (бикс) без фильтра",
		shortLabelRu: "Бикс без фильтра (3 сут.)",
		minShelfLifeDays: 3,
		maxShelfLifeDays: 3,
		defaultShelfLifeDays: 3,
		sealingMethodRu: "Закрытие пояса после извлечения",
		sanpinClauseRu: "СанПиН 3.3686-21 Таблица 3.14 (3 суток)",
		gostStandardRu: "Коробка КСК",
		descriptionRu: "Коробка с боковыми отверстиями.",
		storageRequirementsRu: "В закрытых шкафах.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "calico_double_wrap",
		nameRu: "Двойная мягкая бязевая упаковка",
		shortLabelRu: "Двойная бязь (3 сут.)",
		minShelfLifeDays: 3,
		maxShelfLifeDays: 3,
		defaultShelfLifeDays: 3,
		sealingMethodRu: "Двухслойное пеленание в бязь",
		sanpinClauseRu: "СанПиН 3.3686-21 Таблица 3.14 (3 суток)",
		gostStandardRu: "Отбеленная бязь",
		descriptionRu: "Тканевая упаковка в два слоя.",
		storageRequirementsRu: "В шкафах, влажность до 60%.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
];
