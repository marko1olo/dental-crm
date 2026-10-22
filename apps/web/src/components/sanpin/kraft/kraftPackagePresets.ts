/**
 * SANPIN 3.3686-21 & GOST R ISO 11607 KRAFT PACKAGING PRESETS & NORMS
 */

import {
	type KraftPackageMaterialId,
	type KraftPackageMaterialDefinition,
	KRAFT_PACKAGE_MATERIALS,
	type KraftPackageSizeId,
	type KraftPackageSizeDefinition,
	KRAFT_PACKAGE_SIZES,
} from "@dental/shared";

export type {
	KraftPackageMaterialId,
	KraftPackageMaterialDefinition,
	KraftPackageSizeId,
	KraftPackageSizeDefinition,
};

export {
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
};

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
		originalColorHex: "#fb7185",
		originalColorNameRu: "Светло-розовый",
		finalColorHex: "#3b1a0e",
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
		originalColorHex: "#facc15",
		originalColorNameRu: "Желтый",
		finalColorHex: "#542408",
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
		originalColorHex: "#cbd5e1",
		originalColorNameRu: "Светло-бежевый / серый",
		finalColorHex: "#0f172a",
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
		originalColorHex: "#e2e8f0",
		originalColorNameRu: "Светло-серый",
		finalColorHex: "#020617",
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

export interface QuickKraftPreset {
	readonly id: string;
	readonly brandNameRu: string;
	readonly dimensionsMm: string;
	readonly materialId: KraftPackageMaterialId;
	readonly sizeId: KraftPackageSizeId;
	readonly shelfLifeDays: number;
	readonly descriptionRu: string;
	readonly badgeTextRu: string;
}

export const POPULAR_KRAFT_PRESETS: readonly QuickKraftPreset[] = [
	{
		id: "sanpin_sealed_30d",
		brandNameRu: "Крафт-пакет запечатанный",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 30,
		descriptionRu: "Запечатанный самоклеящийся крафт-пакет (срок стерильности 30 суток)",
		badgeTextRu: "30 суток",
	},
	{
		id: "azov_100x200_50d",
		brandNameRu: "Azov Самоклейка",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 50,
		descriptionRu: "Пакет бумажный самоклеящийся (СанПиН 3.3686-21)",
		badgeTextRu: "50 суток",
	},
	{
		id: "dgm_75x150_50d",
		brandNameRu: "DGM Steriguard 75×150",
		dimensionsMm: "75×150 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_75x150",
		shelfLifeDays: 50,
		descriptionRu: "Самоклеящийся крафт-пакет для боров и эндодонтии",
		badgeTextRu: "50 суток",
	},
	{
		id: "dgm_100x200_30d",
		brandNameRu: "DGM Steriguard 100×200",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 30,
		descriptionRu: "Пакет для смотровых и терапевтических наборов",
		badgeTextRu: "30 суток",
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
