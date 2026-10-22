/**
 * apps/web/src/components/sanpin/kraft/kraftPackagingTypes.ts
 *
 * Каталог упаковочных материалов для стерилизации по СанПиН 3.3686-21.
 * Нормы сроков годности (Таблица 3.14) и типы упаковки.
 */

export type SanpinPackagingTypeId =
	| "kraft_self_seal"
	| "paper_plastic_heat_seal"
	| "crepe_paper_double"
	| "bix_filter"
	| "bix_no_filter"
	| "calico_double_wrap";

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
		sealingMethodRu: "Встроенный клеевой клапан с защитной полосой",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / ГОСТ 10354",
		descriptionRu: "Пакет из влагопрочной медицинской крафт-бумаги плотностью 70–80 г/м² с клапаном на липкой основе.",
		storageRequirementsRu: "Хранить в закрытых сухих шкафах/ящиках при температуре +10...+30°C.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "paper_plastic_heat_seal",
		nameRu: "Комбинированный пакет термосварной (бумага + пленка)",
		shortLabelRu: "Комби-пакет термосварной (50–60 сут. / до 180 сут.)",
		minShelfLifeDays: 50,
		maxShelfLifeDays: 180,
		defaultShelfLifeDays: 60,
		sealingMethodRu: "Термосварочный импульсный аппарат (ширина шва ≥ 8 мм)",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14), п. 3634",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-5",
		descriptionRu: "Многослойная прозрачная полимерная пленка и медицинская бумага.",
		storageRequirementsRu: "В шкафах чистой зоны, беречь от прямых солнечных лучей.",
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
		sealingMethodRu: "Складывание конвертом в 2 слоя с фиксацией индикаторным скотчем",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-2",
		descriptionRu: "Мягкая крепированная бумага повышенной прочности для крупных наборов.",
		storageRequirementsRu: "В закрытых шкафах или остекленных витринах.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "bix_filter",
		nameRu: "Стерилизационная коробка (бикс) с антибактериальным фильтром (КФ)",
		shortLabelRu: "Бикс с фильтром КФ (20–30 сут.)",
		minShelfLifeDays: 20,
		maxShelfLifeDays: 30,
		defaultShelfLifeDays: 20,
		sealingMethodRu: "Герметичная крышка с хлопчатобумажным фильтром",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3631",
		gostStandardRu: "ГОСТ 19569-89",
		descriptionRu: "Металлическая коробка круглая или прямоугольная с фильтрами.",
		storageRequirementsRu: "В чистой зоне стерилизационной.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "bix_no_filter",
		nameRu: "Стерилизационная коробка (бикс) без фильтра (КСК с поясными отверстиями)",
		shortLabelRu: "Бикс без фильтра КСК (3 сут.)",
		minShelfLifeDays: 3,
		maxShelfLifeDays: 3,
		defaultShelfLifeDays: 3,
		sealingMethodRu: "Закрытие пояса с боковыми отверстиями после извлечения из автоклава",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3631",
		gostStandardRu: "ГОСТ 19569-89",
		descriptionRu: "Коробка стерилизационная круглая с боковыми поясными отверстиями.",
		storageRequirementsRu: "В закрытых шкафах стерилизационной.",
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
		sealingMethodRu: "Двухслойное пеленание в отбеленную бязь с перевязкой тесьмой",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3630",
		gostStandardRu: "ГОСТ 29298-2005",
		descriptionRu: "Тканевая упаковка из плотной отбеленной бязи в два слоя.",
		storageRequirementsRu: "Хранить в закрытых шкафах при влажности не выше 60%.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
];
