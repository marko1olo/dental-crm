/**
 * ============================================================================
 * SANPIN 3.3686-21 KRAFT PACKAGE, CHEMICAL INDICATOR & TRAY PRESETS (LAYER 1)
 * Нормативные типоразмеры крафт-пакетов (п. 3632 СанПиН 3.3686-21),
 * химические индикаторы 4-5 классов (Винар, DGM Steriguard, Медтест),
 * 1-кликовый генератор стерильного смотрового лотка и образцы штрихкодов.
 * ============================================================================
 */

import type { ParsedKraftBarcode } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type {
	ChemicalIndicatorOption,
	KraftPackageSizeOption,
	SampleKraftBarcode,
	StandardTrayDefinition,
	StandardTrayType,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SAMPLE TEST BARCODES (БЫСТРЫЕ ОБРАЗЦЫ ДЛЯ ПРОВЕРКИ В ДЕМО-РЕЖИМЕ)
// ─────────────────────────────────────────────────────────────────────────────

function getDynamicSampleBarcodes(): readonly SampleKraftBarcode[] {
	const now = new Date();
	const packDateIso = now.toISOString().slice(0, 10);
	const dateDigits = packDateIso.replace(/-/g, "").slice(2); // YYMMDD
	const fullDateDigits = packDateIso.replace(/-/g, ""); // YYYYMMDD
	const expDate = new Date(now.getTime() + 50 * 24 * 3600 * 1000);
	const expDateIso = expDate.toISOString().slice(0, 10);

	return [
		{
			label: "Терапевтический лоток (50 сут.)",
			barcode: `KB${dateDigits}0001`,
			badge: "Терапия",
			description: "Стандартный смотровой лоток в самоклеящемся крафт-пакете",
		},
		{
			label: "Эндодонтический набор (134°C / Класс 5)",
			barcode: `ENDO-TRAY-${now.getFullYear()}`,
			badge: "Эндодонтия",
			description: "Стерильный эндодонтический лоток с химическим интегратором 5 класса",
		},
		{
			label: "Хирургический набор экстракционный",
			barcode: `SURG-TRAY-${now.getFullYear()}`,
			badge: "Хирургия",
			description: "Хирургические элеваторы и щипцы в двойной стерильной упаковке",
		},
		{
			label: "2D DataMatrix (АК-01, Цикл №3)",
			barcode: `KB-${fullDateDigits}-01#1|АК-01|CYC3|${packDateIso}|${expDateIso}|NURSE-01|set_therapeutic_tray`,
			badge: "DataMatrix 2D",
			description: "Полный машиночитаемый паспорт стерилизации DataMatrix 2D",
		},
		{
			label: "Просроченный пакет (Мягкий допуск острая боль)",
			barcode: "KB2401010001",
			badge: "Просрочен",
			description: "Тест обнаружения нарушения п. 3632 СанПиН 3.3686-21 с мягким допуском",
		},
	];
}

export const SAMPLE_TEST_BARCODES: readonly SampleKraftBarcode[] =
	getDynamicSampleBarcodes();

/**
 * Получение тестовых крафт-штрихкодов со строгой изоляцией от боевого контура (Mandate 8c Zero Mocks).
 * В боевом режиме (production) возвращает пустой массив (0% моков), в демо — образцы.
 */
export function getSampleKraftBarcodes(
	isDemo = isDemoShowcaseMode(),
): readonly SampleKraftBarcode[] {
	return isDemo ? SAMPLE_TEST_BARCODES : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ТИПОРАЗМЕРЫ КРАФТ-ПАКЕТОВ И ХИМИЧЕСКИЕ ИНДИКАТОРЫ (SSOT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Нормативные типоразмеры крафт-пакетов по СанПиН 3.3686-21 п. 3632
 */
export const STATUTORY_KRAFT_SIZES: readonly KraftPackageSizeOption[] = [
	{
		id: "size_75x150",
		dimensionsMm: "75x150 мм",
		widthMm: 75,
		heightMm: 150,
		maxShelfLifeDays: 50,
		indicatorTypeRu: "Химический индикатор 4/5 класса (Винар / DGM / Медтест)",
		typicalUsageRu:
			"Боры алмазные и твердосплавные, эндодонтические файлы, мелкий инструментарий",
	},
	{
		id: "size_100x200",
		dimensionsMm: "100x200 мм",
		widthMm: 100,
		heightMm: 200,
		maxShelfLifeDays: 50,
		indicatorTypeRu: "Химический интегратор 5 класса (ИнтеТЕСТ-В-134/5)",
		typicalUsageRu:
			"Стандартный смотровой терапевтический лоток (зеркало, зонд, пинцет, гладилка)",
	},
	{
		id: "size_150x250",
		dimensionsMm: "150x250 мм",
		widthMm: 150,
		heightMm: 250,
		maxShelfLifeDays: 50,
		indicatorTypeRu:
			"Химический интегратор 5 класса (DGM Steriguard 5 / ИнтеТЕСТ-В-134/20)",
		typicalUsageRu:
			"Хирургический экстракционный набор, кюреты Грейси, стоматологические наконечники",
	},
];

export const STATUTORY_CHEMICAL_INDICATOR_OPTIONS: readonly ChemicalIndicatorOption[] = [
	{
		id: "vinar_intetest_134_5",
		manufacturer: "Винар",
		tradeName: "ИнтеТЕСТ-В-134/5",
		indicatorClass: 5,
		indicatorClassRu: "5 класс (Химический интегратор пара)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин (в упаковке)",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu:
			"Контроль критических параметров пара во всех 5 точках камеры автоклавов B-класса (Melag, Euronda, W&H)",
	},
	{
		id: "vinar_steritest_134_4",
		manufacturer: "Винар",
		tradeName: "СтериТЕСТ-В-134",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Многопараметрический индикатор)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Многопеременный индикатор температуры и времени выдержки",
	},
	{
		id: "vinar_steritest_121_4",
		manufacturer: "Винар",
		tradeName: "СтериТЕСТ-В-121",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Многопараметрический индикатор)",
		methodType: "steam",
		targetRegimeRu: "121°C / 1.1 бар / 20 мин (для наконечников и пластика)",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Индикатор 4 класса для щадящего деликатного режима 121°C",
	},
	{
		id: "dgm_steriguard_5_integrator",
		manufacturer: "DGM Steriguard",
		tradeName: "DGM Steriguard 5 Integrator",
		indicatorClass: 5,
		indicatorClassRu: "5 класс (Химический интегратор пара)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин или 20 мин (Prion)",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Интегратор 5 класса DGM Steriguard с четким переходом в зону ACCEPT",
	},
	{
		id: "dgm_steriguard_4_multivariable",
		manufacturer: "DGM Steriguard",
		tradeName: "DGM Steriguard 4 Multivariable",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Многопеременный индикатор)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин (в упаковке)",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Многопараметрический химический индикатор 4 класса DGM Steriguard",
	},
	{
		id: "medtest_medis_180",
		manufacturer: "Медтест",
		tradeName: "МедИС-180 (Медтест)",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Воздушная стерилизация)",
		methodType: "dry_heat",
		targetRegimeRu: "180°C / 60 минут",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu:
			"Контроль воздушной стерилизации в 5 точках сухожаровых шкафов ГП-10, ГП-20, ГП-40",
	},
	{
		id: "medtest_medis_160",
		manufacturer: "Медтест",
		tradeName: "МедИС-160 (Медтест)",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Воздушная стерилизация)",
		methodType: "dry_heat",
		targetRegimeRu: "160°C / 150 минут",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Контроль щадящего воздушного режима 160°C / 150 мин",
	},
	{
		id: "medtest_integrator_134",
		manufacturer: "Медтест",
		tradeName: "Медтест-Интегратор-134",
		indicatorClass: 5,
		indicatorClassRu: "5 класс (Паровой интегратор)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Интегратор 5 класса Медтест для паровых стерилизаторов B-класса",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. ДИНАМИЧЕСКИЙ ГЕНЕРАТОР ВАЛИДНОГО СТАНДАРТНОГО ЛОТКА (1 КЛИК ДЛЯ ВРАЧА)
// ─────────────────────────────────────────────────────────────────────────────

export const STANDARD_TRAY_OPTIONS: readonly StandardTrayDefinition[] = [
	{
		id: "therapy",
		toolSetCode: "set_therapeutic_tray",
		labelRu: "Стандартный смотровой лоток терапевта (зеркало, зонд, пинцет, гладилка)",
		shortLabelRu: "Лоток терапевта",
		descriptionRu:
			"Базовый набор терапевтического приема в самоклеящемся крафт-пакете (50 сут.)",
	},
	{
		id: "surgery",
		toolSetCode: "set_surgery_basic",
		labelRu: "Хирургический набор экстракционный (элеваторы, щипцы, кюрета)",
		shortLabelRu: "Лоток хирурга",
		descriptionRu:
			"Хирургический экстракционный набор в двойной стерильной упаковке (60 сут.)",
	},
	{
		id: "endo",
		toolSetCode: "set_endo_instruments",
		labelRu: "Эндодонтический набор (файлы Ni-Ti, спредер, плаггер)",
		shortLabelRu: "Эндо-набор",
		descriptionRu:
			"Стерильный эндодонтический лоток с химическим интегратором 5 класса (134°C)",
	},
];

export function createStandardSterileTrayBarcode(
	trayType: StandardTrayType = "therapy",
	packDate: Date = new Date(),
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): ParsedKraftBarcode {
	const packDateIso = packDate.toISOString().slice(0, 10);
	const daysLifespan = trayType === "surgery" ? 60 : 50;
	const expDate = new Date(packDate.getTime() + daysLifespan * 24 * 3600 * 1000);
	const expDateIso = expDate.toISOString().slice(0, 10);
	const fallbackTray: StandardTrayDefinition = STANDARD_TRAY_OPTIONS[0] ?? {
		id: "therapy",
		toolSetCode: "set_therapeutic_tray",
		labelRu: "Стандартный смотровой лоток терапевта",
		shortLabelRu: "Лоток терапевта",
		descriptionRu: "Базовый набор",
	};
	const trayDef = STANDARD_TRAY_OPTIONS.find((t) => t.id === trayType) ?? fallbackTray;

	const dateDigits = packDateIso.replace(/-/g, "");
	const rawInput = `KB-${dateDigits}-01#1|АК-01|CYC1|${packDateIso}|${expDateIso}|NURSE-01|${trayDef.toolSetCode}`;

	const formattedProtocolRecord043 = `Инструменты стерильны. Крафт-пакет №${rawInput} (Стерилизация инструментария: АК-01, цикл №1 от ${packDateIso}, годен до ${expDateIso}, ${trayDef.labelRu}), индикатор 5 класса (ИнтеТЕСТ 134°C) — норма. ${operatorName} [СанПиН 3.3686-21] вскрыт при пациенте.`;

	const packageMaterialId =
		trayType === "surgery" ? "paper_self_seal_double" : "paper_self_seal_single";
	const packageSizeId =
		trayType === "surgery"
			? "size_150x250"
			: trayType === "endo"
				? "size_75x150"
				: "size_100x200";

	return {
		rawInput,
		barcodeType: "datamatrix_2d",
		isValid: true,
		isExpired: false,
		isExpiringSoon: false,
		daysRemaining: daysLifespan,
		daysLifespan,
		batchId: `KB-${dateDigits}-01`,
		serialNumber: 1,
		autoclaveId: "АК-01 (Melag 23B+)",
		cycleNumber: 1,
		packDateIso,
		expDateIso,
		operatorId: "NURSE-01",
		operatorName,
		toolSetId: trayDef.toolSetCode,
		toolSetNameRu: trayDef.labelRu,
		packageMaterialId,
		packageSizeId,
		indicatorId: "vinar_intetest_5",
		indicatorClassRu: "Химический интегратор 5 класса (пар 134°C / норма)",
		indicatorPassed: true,
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		formattedProtocolRecord043,
	};
}
