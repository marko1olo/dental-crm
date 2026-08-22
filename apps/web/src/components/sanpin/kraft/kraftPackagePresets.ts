/**
 * ============================================================================
 * SANPIN 3.3686-21 & GOST R ISO 11607 KRAFT PACKAGING PRESETS & NORMS
 * Нормативные классификаторы стерилизационных упаковочных материалов,
 * химических индикаторов классов 4/5, типоразмеров пакетов и стандартных наборов.
 * ============================================================================
 */

export type KraftPackageMaterialId =
	| "paper_self_seal_single"
	| "paper_self_seal_double"
	| "paper_plastic_pouch"
	| "crepe_paper_wrap"
	| "bix_with_filter";

export interface KraftPackageMaterialDefinition {
	readonly id: KraftPackageMaterialId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly statutoryShelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly sanpinClauseRu: string;
	readonly gostStandardRu: string;
	readonly descriptionRu: string;
	readonly recommendedSterilizationMethod: "steam_autoclave_134" | "steam_autoclave_121" | "dry_heat";
	readonly isHeatSealed: boolean;
	readonly isTransparentFilm: boolean;
}

export const KRAFT_PACKAGE_MATERIALS: readonly KraftPackageMaterialDefinition[] = [
	{
		id: "paper_self_seal_single",
		nameRu: "Крафт-пакет бумажный самоклеящийся одинарный",
		shortLabelRu: "Крафт-пакет одинарный (50 сут.)",
		statutoryShelfLifeDays: 50,
		sealingMethodRu: "Встроенная самоклеящаяся лента с защитным лайнером",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / ГОСТ 10354",
		descriptionRu: "Однослойный бумажный крафт-пакет с термовлагостойким клеевым слоем. Для базового терапевтического и смотрового инструментария.",
		recommendedSterilizationMethod: "steam_autoclave_134",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "paper_self_seal_double",
		nameRu: "Крафт-пакет бумажный двойной (двойная упаковка)",
		shortLabelRu: "Крафт-пакет двойной (60 сут.)",
		statutoryShelfLifeDays: 60,
		sealingMethodRu: "Последовательная закладка в два независимых самоклеящихся пакета",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3634",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018",
		descriptionRu: "Двойной барьер из крафт-бумаги. Повышенная надежность стерильности при межкабинетной транспортировке и длительном хранении.",
		recommendedSterilizationMethod: "steam_autoclave_134",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "paper_plastic_pouch",
		nameRu: "Комбинированный пакет бумага + прозрачная пленка термосварочный",
		shortLabelRu: "Комби-пакет бумага+пленка (180 сут. / 6 мес.)",
		statutoryShelfLifeDays: 180,
		sealingMethodRu: "Термосварочный аппарат (ширина герметичного шва >= 8 мм)",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-5",
		descriptionRu: "Многослойный ламинат (PET/PP) с медицинской бумагой. Максимальный барьерный срок 6 месяцев при температуре 180–200°C запайки.",
		recommendedSterilizationMethod: "steam_autoclave_134",
		isHeatSealed: true,
		isTransparentFilm: true,
	},
	{
		id: "crepe_paper_wrap",
		nameRu: "Крепированная бумага стерилизационная (2 слоя)",
		shortLabelRu: "Креп-бумага 2 слоя (60 сут.)",
		statutoryShelfLifeDays: 60,
		sealingMethodRu: "Конвертное двухслойное обертывание с фиксацией индикаторным скотчем",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3633",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-2",
		descriptionRu: "Мягкая воздухопроницаемая крепированная бумага высокой плотности (60 г/м²). Идеальна для тяжелых хирургических лотков и кассет.",
		recommendedSterilizationMethod: "steam_autoclave_134",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "bix_with_filter",
		nameRu: "Стерилизационная коробка (Бикс КСПФ с антибактериальным фильтром)",
		shortLabelRu: "Бикс КСПФ с фильтром (20 сут.)",
		statutoryShelfLifeDays: 20,
		sealingMethodRu: "Механические замки крышки с хлопчатобумажным фильтром",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3631",
		gostStandardRu: "ГОСТ Р 51574 / ТУ 9451-002",
		descriptionRu: "Многоразовый металлический бикс с фильтрами в крышке и дне. Срок сохранения стерильности без вскрытия — 20 суток (после вскрытия — 24 ч).",
		recommendedSterilizationMethod: "steam_autoclave_134",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
];

export type KraftPackageSizeId =
	| "size_75x150"
	| "size_100x200"
	| "size_150x250"
	| "size_200x300";

export interface KraftPackageSizeDefinition {
	readonly id: KraftPackageSizeId;
	readonly dimensionsMmRu: string;
	readonly widthMm: number;
	readonly heightMm: number;
	readonly titleRu: string;
	readonly recommendedUsageRu: string;
	readonly typicalCapacityItemsCount: number;
}

export const KRAFT_PACKAGE_SIZES: readonly KraftPackageSizeDefinition[] = [
	{
		id: "size_75x150",
		dimensionsMmRu: "75 × 150 мм",
		widthMm: 75,
		heightMm: 150,
		titleRu: "Компактный (для боров, файлов и мелкого инструмента)",
		recommendedUsageRu: "Эндодонтические файлы, алмазные и твердосплавные боры, ультразвуковые насадки, полиры",
		typicalCapacityItemsCount: 6,
	},
	{
		id: "size_100x200",
		dimensionsMmRu: "100 × 200 мм",
		widthMm: 100,
		heightMm: 200,
		titleRu: "Стандартный (для смотрового набора и щипцов)",
		recommendedUsageRu: "Базовый смотровой терапевтический лоток, экстракционные щипцы, элеваторы, пинцеты",
		typicalCapacityItemsCount: 5,
	},
	{
		id: "size_150x250",
		dimensionsMmRu: "150 × 250 мм",
		widthMm: 150,
		heightMm: 250,
		titleRu: "Средний хирургический / пародонтологический",
		recommendedUsageRu: "Набор кюрет Грейси, хирургические ложки, распаторы, наконечники KaVo/NSK",
		typicalCapacityItemsCount: 8,
	},
	{
		id: "size_200x300",
		dimensionsMmRu: "200 × 300 мм",
		widthMm: 200,
		heightMm: 300,
		titleRu: "Крупный лоточный / кассетный",
		recommendedUsageRu: "Сетчатые кассеты имплантологии, полные ортопедические наборы, роторасширители, кламмеры",
		typicalCapacityItemsCount: 15,
	},
];

export type ChemicalIndicatorClass = "class_4_multivariable" | "class_5_integrator";

export interface ChemicalIndicatorDefinition {
	readonly id: string;
	readonly indicatorClass: ChemicalIndicatorClass;
	readonly brandNameRu: string;
	readonly manufacturerRu: string;
	readonly standardTargetParamRu: string;
	readonly originalColorHex: string;
	readonly originalColorNameRu: string;
	readonly finalColorHex: string;
	readonly finalColorNameRu: string;
	readonly sanpinNormRefRu: string;
	readonly inspectionTipRu: string;
}

export const SANPIN_CHEMICAL_INDICATORS: readonly ChemicalIndicatorDefinition[] = [
	{
		id: "vinar_steritest_4",
		indicatorClass: "class_4_multivariable",
		brandNameRu: "СтериТЕСТ-В (Класс 4)",
		manufacturerRu: "НПФ «Винар», Россия",
		standardTargetParamRu: "Пар 134°C / 5 минут или 121°C / 20 минут",
		originalColorHex: "#fb7185", // Розовый
		originalColorNameRu: "Светло-розовый",
		finalColorHex: "#3b1a0e", // Темно-коричневый
		finalColorNameRu: "Темно-коричневый / черный",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 4, СанПиН 3.3686-21 п. 3638",
		inspectionTipRu: "Цвет метки индикатора внутри пакета должен строго совпадать с эталоном сравнения или быть темнее.",
	},
	{
		id: "medtest_medis_4",
		indicatorClass: "class_4_multivariable",
		brandNameRu: "МедИС-134/5 (Класс 4)",
		manufacturerRu: "ООО «Медтест», Россия",
		standardTargetParamRu: "Пар 134°C / 5 минут",
		originalColorHex: "#facc15", // Ярко-желтый
		originalColorNameRu: "Желтый",
		finalColorHex: "#542408", // Коричнево-бурый
		finalColorNameRu: "Темно-коричневый",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 4, СанПиН 3.3686-21 п. 3638",
		inspectionTipRu: "При неполном переходе цвета в коричневый цикл признается недействительным, пакет бракуется.",
	},
	{
		id: "vinar_intetest_5",
		indicatorClass: "class_5_integrator",
		brandNameRu: "ИнтеТЕСТ-В Интегратор (Класс 5)",
		manufacturerRu: "НПФ «Винар», Россия",
		standardTargetParamRu: "Интегратор пар + температура + время (SV: 134°C / 5 мин)",
		originalColorHex: "#cbd5e1", // Бежево-серый
		originalColorNameRu: "Светло-бежевый / серый",
		finalColorHex: "#0f172a", // Темно-синий / глубокий черный
		finalColorNameRu: "Глубокий сине-черный",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 5 (Интеграторы), СанПиН 3.3686-21 п. 3639",
		inspectionTipRu: "Интегратор реагирует на все критические параметры паровой стерилизации с точностью биологического теста.",
	},
	{
		id: "medtest_is5_integrator",
		indicatorClass: "class_5_integrator",
		brandNameRu: "ИС-134/5 Интегратор (Класс 5)",
		manufacturerRu: "ООО «Медтест», Россия",
		standardTargetParamRu: "Пар 134°C / 5.5 мин / 2.1 бар",
		originalColorHex: "#e2e8f0", // Светло-серый
		originalColorNameRu: "Светло-серый",
		finalColorHex: "#020617", // Абсолютный черный
		finalColorNameRu: "Черный эталонный",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 5, СанПиН 3.3686-21",
		inspectionTipRu: "Обязателен при контроле имплантологических и хирургических критических наборов.",
	},
];

export interface DentalToolSetDefinition {
	readonly id: string;
	readonly nameRu: string;
	readonly shortCode: string;
	readonly categoryRu: string;
	readonly defaultMaterialId: KraftPackageMaterialId;
	readonly defaultSizeId: KraftPackageSizeId;
	readonly typicalItemsRu: readonly string[];
	readonly criticalNotesRu: string;
}

export const DENTAL_TOOL_SETS_CATALOG: readonly DentalToolSetDefinition[] = [
	{
		id: "set_therapeutic_tray",
		nameRu: "Терапевтический лоток смотровой",
		shortCode: "TER-TRAY",
		categoryRu: "Терапия / Первичный осмотр",
		defaultMaterialId: "paper_self_seal_single",
		defaultSizeId: "size_100x200",
		typicalItemsRu: [
			"Зеркало стоматологическое с ручкой (фронтальное родиевое)",
			"Зонд угловой стоматологический остроконечный",
			"Пинцет анатомический стоматологический",
			"Гладилка двухсторонняя серповидная",
			"Штопфер шаровидный полировочный",
			"Экскаватор стоматологический №2",
		],
		criticalNotesRu: "Проверка чистоты насечек пинцета и резьбового крепления зеркала перед запайкой.",
	},
	{
		id: "set_endodontic_burs",
		nameRu: "Эндодонтический набор боров и файлов",
		shortCode: "ENDO-SET",
		categoryRu: "Эндодонтия / Лечение каналов",
		defaultMaterialId: "paper_plastic_pouch",
		defaultSizeId: "size_75x150",
		typicalItemsRu: [
			"К-файлы ручные ассорти (№15–40)",
			"Машинные ротационные Ni-Ti файлы Protaper Gold",
			"Спредеры конические для латеральной конденсации",
			"Плаггеры для вертикальной горячей обтурации",
			"Эндодонтическая металлическая линейка 30 мм",
			"Пинцет эндодонтический с продольным пазом",
		],
		criticalNotesRu: "Контроль целостности витков Ni-Ti файлов. Стерилизация в прозрачном комби-пакете для визуального контроля номеров ISO.",
	},
	{
		id: "set_surgical_extraction",
		nameRu: "Хирургический набор для удаления",
		shortCode: "SURG-EXT",
		categoryRu: "Хирургия / Экстракция зубов",
		defaultMaterialId: "paper_self_seal_double",
		defaultSizeId: "size_150x250",
		typicalItemsRu: [
			"Щипцы экстракционные верхние универсальные",
			"Щипцы байонетные (корневые) нижние",
			"Элеватор прямой Бена с рифленой рукояткой",
			"Элеватор штыковидный Леклюза",
			"Кюретажная хирургическая ложка Лукаса",
			"Рукоятка скальпеля №3 с замком под лезвия 12/15",
			"Иглодержатель сосудистый Матье",
		],
		criticalNotesRu: "Двойная упаковка обязательна для предотвращения прокола крафт-бумаги острыми щечками элеваторов.",
	},
	{
		id: "set_periodontal_gracey",
		nameRu: "Пародонтологический кюретаж Грейси",
		shortCode: "PERIO-GRC",
		categoryRu: "Пародонтология / Профгигиена",
		defaultMaterialId: "paper_plastic_pouch",
		defaultSizeId: "size_150x250",
		typicalItemsRu: [
			"Кюрета Грейси 1/2 (для фронтальных зубов)",
			"Кюрета Грейси 7/8 (для премоляров и щечных поверхностей)",
			"Кюрета Грейси 11/12 (для мезиальных поверхностей моляров)",
			"Кюрета Грейси 13/14 (для дистальных поверхностей моляров)",
			"Скейлер серповидный двухсторонний",
			"Пародонтологический зонд ВОЗ с шариком 0.5 мм",
		],
		criticalNotesRu: "Защита тонких режущих граней кюрет силиконовыми колпачками перед упаковкой.",
	},
	{
		id: "set_orthopedic_prep",
		nameRu: "Ортопедический препаровочный набор",
		shortCode: "ORTH-PREP",
		categoryRu: "Ортопедия / Протезирование",
		defaultMaterialId: "paper_plastic_pouch",
		defaultSizeId: "size_100x200",
		typicalItemsRu: [
			"Набор алмазных боров для препарирования под коронки/виниры (торпедовидные, конусные, маркеры глубины)",
			"Ретрактор губ и щек OptraGate",
			"Пинцет артикуляционный Бауша для копирки",
			"Штангенциркуль зуботехнический (микрометр)",
			"Зонд ретракционный тонкий для укладки нити",
		],
		criticalNotesRu: "Упаковка боров в специальной автоклавируемой подставке-органайзере.",
	},
];

export interface AutoclaveUnitPreset {
	readonly id: string;
	readonly brandModelRu: string;
	readonly serialNumber: string;
	readonly chamberVolumeLiters: number;
}

export const CLINIC_AUTOCLAVE_UNITS: readonly AutoclaveUnitPreset[] = [
	{
		id: "AUTO-01",
		brandModelRu: "Melag Vacuklav 23 B+ (Германия)",
		serialNumber: "MEL-2024-9841",
		chamberVolumeLiters: 22,
	},
	{
		id: "AUTO-02",
		brandModelRu: "W&H Lisa 500 EcoDry (Австрия)",
		serialNumber: "WH-2023-44129",
		chamberVolumeLiters: 17,
	},
	{
		id: "AUTO-03",
		brandModelRu: "Euronda E9 Next (Италия)",
		serialNumber: "EUR-2025-88120",
		chamberVolumeLiters: 24,
	},
];

export function getKraftMaterialDefinition(id: KraftPackageMaterialId): KraftPackageMaterialDefinition {
	const found = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === id);
	return found || KRAFT_PACKAGE_MATERIALS[0]!;
}

export function getKraftSizeDefinition(id: KraftPackageSizeId): KraftPackageSizeDefinition {
	const found = KRAFT_PACKAGE_SIZES.find((s) => s.id === id);
	return found || KRAFT_PACKAGE_SIZES[1]!;
}

export function getChemicalIndicatorDefinition(id: string): ChemicalIndicatorDefinition {
	const found = SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === id);
	return found || SANPIN_CHEMICAL_INDICATORS[0]!;
}

export function getDentalToolSetDefinition(id: string): DentalToolSetDefinition {
	const found = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === id);
	return found || DENTAL_TOOL_SETS_CATALOG[0]!;
}
