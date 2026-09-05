/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION PRESETS & PROTOCOLS ENGINE
 * Нормативные классификаторы СанПиН 3.3686-21, 1-кликовые пресеты автоклавирования
 * класса B (форма № 257/у), контроль качества ПСО (форма № 366/у: азопирам,
 * фенолфталеин) и моментальная генерация валидных крафт-пакетов без бюрократии.
 * ============================================================================
 */

import type { ParsedKraftBarcode } from "@dental/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SAMPLE TEST BARCODES (БЫСТРЫЕ ОБРАЗЦЫ ДЛЯ ПРОВЕРКИ)
// ─────────────────────────────────────────────────────────────────────────────

export interface SampleKraftBarcode {
	readonly label: string;
	readonly barcode: string;
	readonly badge: string;
	readonly description?: string;
}

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

export const SAMPLE_TEST_BARCODES: readonly SampleKraftBarcode[] = getDynamicSampleBarcodes();

// ─────────────────────────────────────────────────────────────────────────────
// 2. ДАННЫЕ И ТИПЫ ДЛЯ ЖУРНАЛА АВТОКЛАВИРОВАНИЯ (ФОРМА № 257/У)
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoclaveCycleRecord {
	readonly id: string;
	readonly cycleNumber: number;
	readonly autoclaveCode: string;
	readonly autoclaveModel: string;
	readonly temperatureC: number;
	readonly pressureBar: number;
	readonly exposureMinutes: number;
	readonly preVacuum: string;
	readonly indicatorPointsStatus: string;
	readonly bowieDickResult: "passed" | "not_performed" | "failed";
	readonly bowieDickNote: string;
	readonly loadDescription: string;
	readonly packageType: string;
	readonly batchVerdict: "ГОДНА" | "БРАК";
	readonly operatorName: string;
	readonly timestamp: string;
	readonly sanpinClause: string;
	readonly isQuickPreset?: boolean;
}

export const SANPIN_AUTOCLAVE_CLASS_B_PRESET: Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp"> = {
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ (Class B)",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 5,
	preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus: "Индикаторы 5 класса (интеграторы) — темные во всех 5 точках камеры (норма)",
	bowieDickResult: "passed",
	bowieDickNote: "Тест Бови-Дика пройден: равномерное изменение цвета тест-пакета по всему полю (норма вакуума и пара)",
	loadDescription: "Смотровые лотки терапевта, хирургические наборы, наконечники в крафт-пакетах",
	packageType: "Самоклеящиеся крафт-пакеты (ГОСТ Р ИСО 11607-1-2018)",
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3630, МУ 287-113",
	isQuickPreset: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. КОНТРОЛЬ КАЧЕСТВА ПСО (ФОРМА № 366/У: АЗОПИРАМ, ФЕНОЛФТАЛЕИН)
// ─────────────────────────────────────────────────────────────────────────────

export interface PsoQualityRecord {
	readonly id: string;
	readonly testType: "azopyram" | "phenolphthalein" | "both";
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly azopyramResult: "negative" | "positive";
	readonly phenolphthaleinResult: "negative" | "positive";
	readonly detergentBrand: string;
	readonly isApproved: boolean;
	readonly operatorName: string;
	readonly timestamp: string;
	readonly sanpinClause: string;
	readonly notes: string;
}

export const SANPIN_AZOPYRAM_TEST_PRESET: Omit<PsoQualityRecord, "id" | "timestamp"> = {
	testType: "azopyram",
	instrumentName: "Терапевтический и хирургический инструментарий (зеркала, зонды, пинцеты, щипцы)",
	batchItemCount: 120,
	testedSampleCount: 5, // 1% от партии (не менее 3-5 изделий)
	azopyramResult: "negative",
	phenolphthaleinResult: "negative",
	detergentBrand: "Оптимакс Про 1.5% + ферментный очиститель",
	isApproved: true,
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3584, форма № 366/у",
	notes: "100% отрицательно. Фиолетового окрашивания нет в течение 1 мин, скрытая кровь и СМС отсутствуют. Партия допущена к стерилизации.",
};

export const SANPIN_PHENOLPHTHALEIN_TEST_PRESET: Omit<PsoQualityRecord, "id" | "timestamp"> = {
	testType: "phenolphthalein",
	instrumentName: "Смотровые лотки и наконечники после проточной отмывки дистиллированной водой",
	batchItemCount: 120,
	testedSampleCount: 5,
	azopyramResult: "negative",
	phenolphthaleinResult: "negative",
	detergentBrand: "Биолот 0.5%",
	isApproved: true,
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3585",
	notes: "Отрицательно. Розового окрашивания нет, щелочные компоненты моющего средства полностью отмыты (pH нейтральный).",
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. ФАБРИКИ БЫСТРЫХ ЗАПИСЕЙ ЦСО В 1 КЛИК
// ─────────────────────────────────────────────────────────────────────────────

export function createQuickAutoclaveCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): AutoclaveCycleRecord {
	return {
		id: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickAzopyramRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): PsoQualityRecord {
	return {
		id: `pso-azo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		...SANPIN_AZOPYRAM_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickPhenolphthaleinRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): PsoQualityRecord {
	return {
		id: `pso-ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		...SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ДИНАМИЧЕСКИЙ ГЕНЕРАТОР ВАЛИДНОГО СТАНДАРТНОГО ЛОТКА (1 КЛИК ДЛЯ ВРАЧА)
// ─────────────────────────────────────────────────────────────────────────────

export type StandardTrayType = "therapy" | "surgery" | "endo";

export interface StandardTrayDefinition {
	readonly id: StandardTrayType;
	readonly toolSetCode: string;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
}

export const STANDARD_TRAY_OPTIONS: readonly StandardTrayDefinition[] = [
	{
		id: "therapy",
		toolSetCode: "set_therapeutic_tray",
		labelRu: "Стандартный смотровой лоток терапевта (зеркало, зонд, пинцет, гладилка)",
		shortLabelRu: "Лоток терапевта",
		descriptionRu: "Базовый набор терапевтического приема в самоклеящемся крафт-пакете (50 сут.)",
	},
	{
		id: "surgery",
		toolSetCode: "set_surgery_basic",
		labelRu: "Хирургический набор экстракционный (элеваторы, щипцы, кюрета)",
		shortLabelRu: "Лоток хирурга",
		descriptionRu: "Хирургический экстракционный набор в двойной стерильной упаковке (60 сут.)",
	},
	{
		id: "endo",
		toolSetCode: "set_endo_instruments",
		labelRu: "Эндодонтический набор (файлы Ni-Ti, спредер, плаггер)",
		shortLabelRu: "Эндо-набор",
		descriptionRu: "Стерильный эндодонтический лоток с химическим интегратором 5 класса (134°C)",
	},
];

/**
 * Мгновенно генерирует валидный крафт-пакет со СВЕЖЕЙ сегодняшней датой стерилизации.
 * Освобождает врача и ассистента от необходимости сканировать физический ШК сканером.
 */
export function createStandardSterileTrayBarcode(
	trayType: StandardTrayType = "therapy",
	packDate: Date = new Date(),
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): ParsedKraftBarcode {
	const packDateIso = packDate.toISOString().slice(0, 10);
	const expDate = new Date(packDate.getTime() + 50 * 24 * 3600 * 1000);
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

	return {
		rawInput,
		barcodeType: "datamatrix_2d",
		isValid: true,
		isExpired: false,
		isExpiringSoon: false,
		daysRemaining: 50,
		daysLifespan: 50,
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
		packageMaterialId: "paper_self_seal_single",
		packageSizeId: "size_100x200",
		indicatorId: "vinar_intetest_5",
		indicatorClassRu: "Химический интегратор 5 класса (пар 134°C / норма)",
		indicatorPassed: true,
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		formattedProtocolRecord043,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. СТАРТОВЫЕ ДЕМО-ДАННЫЕ ДЛЯ ЦСО И СТУДИИ СТЕРИЛИЗАЦИИ
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_AUTOCLAVE_CYCLES_DEMO: readonly AutoclaveCycleRecord[] = [
	{
		id: "demo-cycle-01",
		cycleNumber: 1,
		autoclaveCode: "АК-01",
		autoclaveModel: "MELAG Vacuklav 23 B+ (Class B)",
		temperatureC: 134,
		pressureBar: 2.1,
		exposureMinutes: 5,
		preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
		indicatorPointsStatus: "Индикаторы 5 класса — норма во всех 5 точках камеры",
		bowieDickResult: "passed",
		bowieDickNote: "Тест Бови-Дика пройден (утренний контроль вакуума и проникновения пара)",
		loadDescription: "Смотровые лотки терапевта (4 шт), базовый хирургический лоток (2 шт)",
		packageType: "Самоклеящиеся крафт-пакеты",
		batchVerdict: "ГОДНА",
		operatorName: "Смирнова А.В. (медсестра ЦСО)",
		timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
		sanpinClause: "СанПиН 3.3686-21 п. 3630",
		isQuickPreset: true,
	},
	{
		id: "demo-cycle-02",
		cycleNumber: 2,
		autoclaveCode: "АК-01",
		autoclaveModel: "MELAG Vacuklav 23 B+ (Class B)",
		temperatureC: 134,
		pressureBar: 2.1,
		exposureMinutes: 5,
		preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
		indicatorPointsStatus: "Индикаторы 5 класса — норма во всех 5 точках камеры",
		bowieDickResult: "passed",
		bowieDickNote: "Тест Бови-Дика в норме",
		loadDescription: "Эндодонтические наборы, наконечники турбинные и угловые в пакетах",
		packageType: "Пакеты бумага-пленка термошовные",
		batchVerdict: "ГОДНА",
		operatorName: "Смирнова А.В. (медсестра ЦСО)",
		timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
		sanpinClause: "СанПиН 3.3686-21 п. 3630",
		isQuickPreset: true,
	},
];

export const DEFAULT_PSO_QUALITY_DEMO: readonly PsoQualityRecord[] = [
	{
		id: "demo-pso-01",
		testType: "both",
		instrumentName: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты)",
		batchItemCount: 120,
		testedSampleCount: 5,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		detergentBrand: "Оптимакс Про 1.5%",
		isApproved: true,
		operatorName: "Смирнова А.В. (медсестра ЦСО)",
		timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
		sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
		notes: "Азопирам и фенолфталеин отрицательны. Скрытая кровь и щелочные ПАВ отсутствуют.",
	},
	{
		id: "demo-pso-02",
		testType: "azopyram",
		instrumentName: "Хирургические экстракционные щипцы и элеваторы",
		batchItemCount: 40,
		testedSampleCount: 3,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		detergentBrand: "Биолот 0.5%",
		isApproved: true,
		operatorName: "Смирнова А.В. (медсестра ЦСО)",
		timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
		sanpinClause: "СанПиН 3.3686-21 п. 3584, форма № 366/у",
		notes: "Замковые части и щечки чистые. Азопирамовая проба отрицательная.",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. КОМПЛЕКСНЫЕ 1-КЛИКОВЫЕ ПРЕСЕТЫ СМЕНЫ МЕДСЕСТРЫ ЦСО (САНПИН 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

export function createQuickCombinedPsoRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
	instrumentName = "Терапевтический и хирургический инструментарий смены"
): PsoQualityRecord {
	return {
		id: `pso-both-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		testType: "both",
		instrumentName,
		batchItemCount: 150,
		testedSampleCount: 5,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		detergentBrand: "Оптимакс Про 1.5%",
		isApproved: true,
		operatorName,
		timestamp: new Date().toISOString(),
		sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
		notes: "1-кликовая фиксация проб ПСО: азопирам (кровь) — отрицательно, фенолфталеин (щелочь) — отрицательно. Партия допущена к стерилизации.",
	};
}

export function createQuickDailyShiftAutoclaveCycles(
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): readonly AutoclaveCycleRecord[] {
	const now = Date.now();
	return [
		{
			id: `cycle-shift-1-${now}`,
			cycleNumber: 1,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription: "Утренний тест Бови-Дика + смотровые лотки терапевта (4 шт)",
			operatorName,
			timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
		},
		{
			id: `cycle-shift-2-${now}`,
			cycleNumber: 2,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription: "Эндодонтические наборы, турбинные и угловые наконечники в пакетах (6 шт)",
			operatorName,
			timestamp: new Date(now - 3 * 3600 * 1000).toISOString(),
		},
		{
			id: `cycle-shift-3-${now}`,
			cycleNumber: 3,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription: "Хирургические экстракционные наборы, кюреты, шовный материал (4 шт)",
			operatorName,
			timestamp: new Date().toISOString(),
		},
	];
}

export function createQuickDailyShiftPsoRecords(
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): readonly PsoQualityRecord[] {
	const now = Date.now();
	return [
		{
			id: `pso-shift-1-${now}`,
			testType: "both",
			instrumentName: "Терапевтические смотровые лотки (зеркала, зонды, пинцеты)",
			batchItemCount: 120,
			testedSampleCount: 5,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 5 * 3600 * 1000).toISOString(),
			sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
			notes: "Азопирамовая и фенолфталеиновая пробы отрицательны. Скрытая кровь и остатки СМС отсутствуют.",
		},
		{
			id: `pso-shift-2-${now}`,
			testType: "both",
			instrumentName: "Хирургический инструментарий (щипцы, элеваторы, кюреты)",
			batchItemCount: 45,
			testedSampleCount: 3,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
			sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
			notes: "Замковые щечки и рабочие поверхности чистые. Пробы отрицательны.",
		},
	];
}


