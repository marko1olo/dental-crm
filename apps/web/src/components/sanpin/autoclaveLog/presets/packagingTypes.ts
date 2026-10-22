export type PackagingTypeId =
	| "kraft_pouch_sealed"
	| "kraft_pouch_self_seal"
	| "crepe_paper"
	| "bix_filter"
	| "cassette_bipack"
	| "open_tray_immediate"
	| "test_pack_special";

export interface PackagingTypeDefinition {
	readonly id: PackagingTypeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly shelfLifeDays: number;
	readonly shelfLifeDescriptionRu: string;
	readonly sealingMethodRu: string;
	readonly sanpinRequirementRu: string;
}

export const STATUTORY_PACKAGING_TYPES: readonly PackagingTypeDefinition[] = [
	{
		id: "kraft_pouch_sealed",
		nameRu: "Пакет комбинированный термосварной (бумага + прозрачная пленка)",
		shortLabelRu: "Термошов (комби)",
		shelfLifeDays: 60,
		shelfLifeDescriptionRu: "До 60 суток базово (до 180 суток в чистых боксах по СанПиН 3.3686-21 Табл. 3.14)",
		sealingMethodRu: "Импульсный термосварочный аппарат (180–200°C)",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3632: Обязательная маркировка даты, времени, смены и подписи",
	},
	{
		id: "kraft_pouch_self_seal",
		nameRu: "Крафт-пакет самоклеящийся с клейкой лентой",
		shortLabelRu: "Крафт-самоклейка",
		shelfLifeDays: 30,
		shelfLifeDescriptionRu: "До 30 суток в закрытых сухих шкафах (СанПиН 3.3686-21 п. 3632)",
		sealingMethodRu: "Защитная клейкая полоса с ручным прижимом",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3632",
	},
	{
		id: "crepe_paper",
		nameRu: "Крепированная стерилизационная бумага (двойная обертка)",
		shortLabelRu: "Креп-бумага (2 сл.)",
		shelfLifeDays: 60,
		shelfLifeDescriptionRu: "До 60 суток в двойной стерилизационной обертке (СанПиН 3.3686-21 п. 3633)",
		sealingMethodRu: "Метод конверта с фиксацией индикаторной лентой",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3633",
	},
	{
		id: "bix_filter",
		nameRu: "Стерилизационная коробка (Бикс КФ с антибактериальным фильтром)",
		shortLabelRu: "Бикс КФ (фильтр)",
		shelfLifeDays: 20,
		shelfLifeDescriptionRu: "До 20 суток при целостности фильтров",
		sealingMethodRu: "Замковый механизм бикса + сменные хлопчатобумажные фильтры",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3635",
	},
	{
		id: "cassette_bipack",
		nameRu: "Хирургическая кассета в двойном барьерном пакете (Бипак)",
		shortLabelRu: "Кассета-Бипак",
		shelfLifeDays: 60,
		shelfLifeDescriptionRu: "До 60 суток для имплантологических наборов",
		sealingMethodRu: "Двойной термосварной шов",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3634",
	},
	{
		id: "open_tray_immediate",
		nameRu: "Открытый лоток (для немедленного использования у кресла)",
		shortLabelRu: "Без упаковки (сразу)",
		shelfLifeDays: 0,
		shelfLifeDescriptionRu: "Использование в течение 1 часа на стерильном столе",
		sealingMethodRu: "Без упаковки / накрытый стерильной салфеткой стол",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3638 (Запрещено длительное хранение)",
	},
	{
		id: "test_pack_special",
		nameRu: "Специальный тестовый пакет контроля (Bowie-Dick / Helix PCD)",
		shortLabelRu: "Тест-пакет PCD",
		shelfLifeDays: 0,
		shelfLifeDescriptionRu: "Распечатывается сразу после цикла для оценки теста",
		sealingMethodRu: "Заводская контрольная сборка",
		sanpinRequirementRu: "ГОСТ ISO 11140-4",
	},
];
