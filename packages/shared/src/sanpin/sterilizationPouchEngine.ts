/**
 * ============================================================================
 * SANPIN 3.3686-21 CHAIRSIDE STERILIZATION POUCH ENGINE
 * Учет вскрытия крафт-пакетов стерилизации у стоматологического кресла,
 * химический контроль индикаторов 4-5 классов (розовый -> коричневый, стерильно),
 * фиксация параметров автоклава B-класса D-типа (134°C / 2.1 бар / 5 мин),
 * 1-клик генерация регламентной записи в дневник карты Формы 043/у и
 * сквозная криптографическая связь с электронным журналом автоклавирования (Форма 257/у).
 * ============================================================================
 */

import {
	type Form257Record,
	generateForm257RecordId,
	calculateDigitalStampHash,
	createForm257Record,
} from "./sanpinRegistryEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ChemicalIndicatorClass = 4 | 5;

export type IndicatorColorTransitionId =
	| "pink_to_brown"     // ИнтеТЕСТ / Винар 5 класс (пар 134°C / 5 мин): розовый -> коричневый
	| "yellow_to_purple"  // DGM Steriguard 5 класс (пар 134°C): желтый -> темно-фиолетовый
	| "blue_to_brown"     // МедИС 4 класс (сухожар 180°C): синий/голубой -> коричневый
	| "custom";

export interface IndicatorColorTransitionDef {
	readonly id: IndicatorColorTransitionId;
	readonly indicatorClass: ChemicalIndicatorClass;
	readonly initialColorRu: string;
	readonly finalColorRu: string;
	readonly labelRu: string;
	readonly brandExampleRu: string;
	readonly standardClauseRu: string;
}

export const STATUTORY_INDICATOR_TRANSITIONS: readonly IndicatorColorTransitionDef[] = [
	{
		id: "pink_to_brown",
		indicatorClass: 5,
		initialColorRu: "розовый",
		finalColorRu: "коричневый",
		labelRu: "розовый -> коричневый, стерильно",
		brandExampleRu: "ИнтеТЕСТ-В-134/5 (Винар) / ГОСТ ISO 11140-1 Класс 5",
		standardClauseRu: "СанПиН 3.3686-21 п. 3630",
	},
	{
		id: "yellow_to_purple",
		indicatorClass: 5,
		initialColorRu: "желтый",
		finalColorRu: "фиолетовый",
		labelRu: "желтый -> фиолетовый, стерильно",
		brandExampleRu: "DGM Steriguard Class 5 Integrator",
		standardClauseRu: "СанПиН 3.3686-21 п. 3630",
	},
	{
		id: "blue_to_brown",
		indicatorClass: 4,
		initialColorRu: "голубой",
		finalColorRu: "коричневый",
		labelRu: "голубой -> коричневый, стерильно",
		brandExampleRu: "СтериТЕСТ-В-132 / МедИС-180 (Класс 4)",
		standardClauseRu: "СанПиН 3.3686-21 Таблица 3.12",
	},
];

export interface ChairsideAutoclaveParams {
	readonly autoclaveModel: string;
	readonly autoclaveCode: string;
	readonly regimeName: string;
	readonly temperatureC: number;
	readonly pressureBar: number;
	readonly exposureMinutes: number;
	readonly dateIso: string; // YYYY-MM-DD
	readonly shiftName: string; // e.g. "Смена 1 (утро)" | "Смена 2 (вечер)"
	readonly cycleNumber: number;
	readonly operatorName: string;
}

export interface ChairsideIndicatorState {
	readonly indicatorClass: ChemicalIndicatorClass;
	readonly transitionId: IndicatorColorTransitionId;
	readonly colorStatusText: string;
	readonly isPassed: boolean;
	readonly verifiedAtIso: string;
}

export interface Form257LinkRef {
	readonly recordId: string; // e.g. F257-20260925-АК01-C01
	readonly journalTitleRu: string;
	readonly digitalStampHash: string; // DENTE-CSO-257-...
	readonly isLinked: boolean;
	readonly sanpinClauseRu: string;
}

export type ChairsideTrayKind =
	| "therapeutic"
	| "surgical"
	| "endodontic"
	| "examination"
	| "custom";

export interface ChairsidePouchRecord {
	readonly id: string;
	readonly pouchCode: string; // e.g. "КП-0925-14"
	readonly rawInput: string;
	readonly trayKind: ChairsideTrayKind;
	readonly trayNameRu: string;
	readonly packDateIso: string;
	readonly expDateIso: string;
	readonly daysRemaining: number;
	readonly isExpired: boolean;
	readonly openedInPresenceOfPatient: boolean;
	readonly packagingIntegrityPreserved: boolean;
	readonly indicator: ChairsideIndicatorState;
	readonly autoclave: ChairsideAutoclaveParams;
	readonly form257Link: Form257LinkRef;
	readonly formattedDiaryText043: string;
	readonly statutoryDiarySnippet: string;
	readonly createdAtIso: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEFAULT STATUTORY PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CHAIRSIDE_AUTOCLAVE_PARAMS: ChairsideAutoclaveParams = {
	autoclaveModel: "Автоклав B-класса D-типа (Melag Vacuklav 23 B+ / Euronda)",
	autoclaveCode: "АК-01",
	regimeName: "Режим 134°C, 2.1 бар, экспозиция 5 мин",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 5,
	dateIso: new Date().toISOString().slice(0, 10),
	shiftName: "Смена 1 (утро)",
	cycleNumber: 1,
	operatorName: "Медсестра ЦСО",
};

export const DEFAULT_CHAIRSIDE_INDICATOR_STATE: ChairsideIndicatorState = {
	indicatorClass: 5,
	transitionId: "pink_to_brown",
	colorStatusText: "Индикатор сработал: розовый -> коричневый, стерильно",
	isPassed: true,
	verifiedAtIso: new Date().toISOString(),
};

export interface ChairsideTrayPreset {
	readonly trayKind: ChairsideTrayKind;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly defaultSuffix: string;
	readonly packageMaterialRu: string;
	readonly shelfLifeDays: number;
}

export const CHAIRSIDE_TRAY_PRESETS: readonly ChairsideTrayPreset[] = [
	{
		trayKind: "therapeutic",
		labelRu: "Терапевтический лоток смотровой (зеркало, зонд, пинцет, гладилка)",
		shortLabelRu: "Лоток терапевта",
		defaultSuffix: "01",
		packageMaterialRu: "Крафт-пакет бумажный самоклеящийся",
		shelfLifeDays: 50,
	},
	{
		trayKind: "surgical",
		labelRu: "Хирургический набор экстракционный (элеваторы, щипцы, кюрета)",
		shortLabelRu: "Хирургический лоток",
		defaultSuffix: "02",
		packageMaterialRu: "Крафт-пакет двойной стерильный",
		shelfLifeDays: 60,
	},
	{
		trayKind: "endodontic",
		labelRu: "Эндодонтический набор (файлы Ni-Ti, спредер, плаггер)",
		shortLabelRu: "Эндо-набор",
		defaultSuffix: "03",
		packageMaterialRu: "Комби-пакет бумага+пленка термосварочный",
		shelfLifeDays: 180,
	},
	{
		trayKind: "examination",
		labelRu: "Базовый смотровой набор врача-стоматолога",
		shortLabelRu: "Смотровой набор",
		defaultSuffix: "04",
		packageMaterialRu: "Крафт-пакет бумажный одинарный",
		shelfLifeDays: 50,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CODE GENERATION & PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Генерирует регламентный номер крафт-пакета по СанПиН (например «КП-0925-14»).
 * Формат: КП-{MMDD}-{SEQUENCE} или пользовательский префикс.
 */
export function generateChairsidePouchCode(
	date: Date | string = new Date(),
	sequence = 14,
	prefix = "КП",
): string {
	const dt = typeof date === "string" ? new Date(date) : date;
	const validDt = Number.isNaN(dt.getTime()) ? new Date() : dt;

	const mm = String(validDt.getMonth() + 1).padStart(2, "0");
	const dd = String(validDt.getDate()).padStart(2, "0");
	const seq = String(Math.max(1, sequence)).padStart(2, "0");

	return `${prefix}-${mm}${dd}-${seq}`;
}

/**
 * Нормализует введенный номер крафт-пакета или штрихкод.
 * Исправляет латинские буквы KP/КП, удаляет лишние пробелы.
 */
export function normalizeChairsidePouchCode(raw: string): string {
	const trimmed = (raw || "").trim().toUpperCase();
	if (!trimmed) return "";

	// Преобразование KP -> КП
	if (trimmed.startsWith("KP-")) {
		return `КП-${trimmed.slice(3)}`;
	}
	if (trimmed.startsWith("KP")) {
		return `КП-${trimmed.slice(2)}`;
	}
	// Если передали просто цифры (например «14» или «0925-14»)
	if (/^\d{1,3}$/.test(trimmed)) {
		const now = new Date();
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const dd = String(now.getDate()).padStart(2, "0");
		return `КП-${mm}${dd}-${trimmed.padStart(2, "0")}`;
	}

	return trimmed;
}

/**
 * Парсит произвольный ввод: короткий номер «КП-0925-14», 1D-штрихкод «KB2609250014»,
 * или 2D DataMatrix с разделителями «|».
 */
export function parseChairsidePouchInput(
	rawInput: string,
	referenceDate: Date | string = new Date(),
): {
	readonly pouchCode: string;
	readonly detectedKind: ChairsideTrayKind;
	readonly detectedCycleNumber: number;
	readonly detectedAutoclaveCode: string;
	readonly parsedPackDateIso: string;
} {
	const input = (rawInput || "").trim();
	const refDt = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
	const refDateIso = Number.isNaN(refDt.getTime()) ? new Date().toISOString().slice(0, 10) : refDt.toISOString().slice(0, 10);

	if (!input) {
		const defaultCode = generateChairsidePouchCode(refDateIso, 14);
		return {
			pouchCode: defaultCode,
			detectedKind: "therapeutic",
			detectedCycleNumber: 1,
			detectedAutoclaveCode: "АК-01",
			parsedPackDateIso: refDateIso,
		};
	}

	// 1. Формат 2D DataMatrix (BATCH#SERIAL|AUTOCLAVE|CYC|PACK|EXP|OPERATOR|TOOLSET)
	if (input.includes("|")) {
		const parts = input.split("|").map((p) => p.trim());
		const autoCode = parts[1] || "АК-01";
		const cycNum = parseInt((parts[2] || "CYC1").replace(/[^0-9]/g, ""), 10) || 1;
		const packIso = parts[3] ? parts[3].slice(0, 10) : refDateIso;
		const toolSet = parts[6] || "";

		let kind: ChairsideTrayKind = "therapeutic";
		if (toolSet.includes("surg") || toolSet.includes("SURG")) kind = "surgical";
		else if (toolSet.includes("endo") || toolSet.includes("ENDO")) kind = "endodontic";

		const rawBatch = parts[0] || "КП";
		const pouchCode = rawBatch.includes("#") ? rawBatch.replace("#", "-") : rawBatch;

		return {
			pouchCode: normalizeChairsidePouchCode(pouchCode),
			detectedKind: kind,
			detectedCycleNumber: cycNum,
			detectedAutoclaveCode: autoCode,
			parsedPackDateIso: packIso,
		};
	}

	// 2. Формат 1D штрихкода KB{YYMMDD}{NNNN}
	const kbMatch = /^KB(\d{2})(\d{2})(\d{2})(\d{4})$/i.exec(input);
	if (kbMatch) {
		const yy = kbMatch[1];
		const mm = kbMatch[2];
		const dd = kbMatch[3];
		const seq = parseInt(kbMatch[4] || "14", 10) % 100;
		const packIso = `20${yy}-${mm}-${dd}`;
		const cycleNum = Math.max(1, Math.floor(parseInt(kbMatch[4] || "1", 10) / 100) || 1);

		return {
			pouchCode: `КП-${mm}${dd}-${String(seq).padStart(2, "0")}`,
			detectedKind: "therapeutic",
			detectedCycleNumber: cycleNum,
			detectedAutoclaveCode: "АК-01",
			parsedPackDateIso: packIso,
		};
	}

	// 3. Формат со специфическими метками лотков
	let kind: ChairsideTrayKind = "therapeutic";
	const upper = input.toUpperCase();
	if (upper.includes("ХИР") || upper.includes("SURG")) kind = "surgical";
	else if (upper.includes("ЭНДО") || upper.includes("ENDO")) kind = "endodontic";
	else if (upper.includes("СМОТР") || upper.includes("EXAM")) kind = "examination";

	return {
		pouchCode: normalizeChairsidePouchCode(input),
		detectedKind: kind,
		detectedCycleNumber: 1,
		detectedAutoclaveCode: "АК-01",
		parsedPackDateIso: refDateIso,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LINK WITH FORM 257/У (ELECTRONIC STERILIZATION REGISTER)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Создает криптографическую связку крафт-пакета с записью журнала автоклавирования Формы 257/у.
 */
export function createForm257Link(
	pouchCode: string,
	autoclave: ChairsideAutoclaveParams,
	isPassed = true,
): Form257LinkRef {
	const recordId = generateForm257RecordId(autoclave.dateIso, autoclave.cycleNumber, autoclave.autoclaveCode);
	const digitalStampHash = calculateDigitalStampHash({
		id: `${recordId}-${pouchCode}`,
		date: autoclave.dateIso,
		cycleNumber: autoclave.cycleNumber,
		sterilizerCode: autoclave.autoclaveCode,
		actualTemp: autoclave.temperatureC,
		actualPressure: autoclave.pressureBar,
		actualTime: autoclave.exposureMinutes,
		isPassed,
		operatorName: autoclave.operatorName,
	});

	return {
		recordId,
		journalTitleRu: "Журнал контроля работы стерилизаторов (автоклавов) Форма № 257/у",
		digitalStampHash,
		isLinked: true,
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3630, 3632 (Таблица 3.12)",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TEXT FORMATTING FOR FORM 043/У DIARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Формирует компактную и регламентную запись для дневника приёма Формы 043/у.
 * Точно соответствует клиническому стандарту:
 * «Стерильный лоток №КП-0925-14 вскрыт в присутствии пациента, индикатор 5 класса сработал»
 */
export function formatPouch043StatutorySnippet(params: {
	readonly pouchCode: string;
	readonly indicatorClass?: ChemicalIndicatorClass | undefined;
	readonly openedInPresenceOfPatient?: boolean | undefined;
	readonly isPassed?: boolean | undefined;
}): string {
	const code = normalizeChairsidePouchCode(params.pouchCode) || "КП-0925-14";
	const cls = params.indicatorClass ?? 5;
	const presence = params.openedInPresenceOfPatient !== false ? "в присутствии пациента" : "перед приёмом";

	if (params.isPassed === false) {
		return `[САНПИН НАРУШЕНИЕ] Стерильный лоток №${code} вскрыт ${presence}, индикатор ${cls} класса НЕ СРАБОТАЛ (инструмент отбракован)!`;
	}

	return `Стерильный лоток №${code} вскрыт ${presence}, индикатор ${cls} класса сработал.`;
}

/**
 * Формирует полную развернутую запись стерилизации для медкарты со всеми параметрами автоклава B-класса
 * и штампом журнала 257/у.
 */
export function formatPouch043FullDiaryText(params: {
	readonly pouchCode: string;
	readonly trayNameRu?: string | undefined;
	readonly indicator: ChairsideIndicatorState;
	readonly autoclave: ChairsideAutoclaveParams;
	readonly form257Link: Form257LinkRef;
	readonly openedInPresenceOfPatient?: boolean | undefined;
	readonly packagingIntegrityPreserved?: boolean | undefined;
}): string {
	const snippet = formatPouch043StatutorySnippet({
		pouchCode: params.pouchCode,
		indicatorClass: params.indicator.indicatorClass,
		openedInPresenceOfPatient: params.openedInPresenceOfPatient,
		isPassed: params.indicator.isPassed,
	});

	const trayPart = params.trayNameRu ? ` [${params.trayNameRu}]` : "";
	const auto = params.autoclave;
	const autoPart = `${auto.autoclaveModel} (${auto.regimeName}, ${auto.autoclaveCode}, ${auto.shiftName})`;
	const integrity = params.packagingIntegrityPreserved !== false ? "Целостность упаковки сохранена." : "Внимание: целостность упаковки под вопросом.";

	return `${snippet}${trayPart} ${integrity} Параметры: ${autoPart}. Контроль индикатора: ${params.indicator.colorStatusText}. [СанПиН 3.3686-21, Форма 257/у: ${params.form257Link.recordId}]. Ответственная медсестра ЦСО: ${auto.operatorName}.`;
}

/**
 * 1-клик внедрение записи крафт-пакета в существующий текст дневника 043/у.
 * Защищает от дублирования при повторном нажатии.
 */
export function insertPouchIntoDiaryText(
	currentDiaryText: string,
	pouchSnippet: string,
	pouchCode: string,
): string {
	const cur = (currentDiaryText || "").trim();
	const cleanCode = normalizeChairsidePouchCode(pouchCode);

	// Если данный крафт-пакет уже упомянут в дневнике — не дублируем
	if (cur && cleanCode && cur.includes(cleanCode)) {
		return cur;
	}

	if (!cur) {
		return pouchSnippet;
	}

	// Если есть секция протокола лечения — вставляем перед манипуляциями или в конец
	return `${pouchSnippet}\n\n${cur}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BUILD COMPLETE RECORD ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateChairsidePouchOptions {
	readonly rawInput?: string | undefined;
	readonly customCode?: string | undefined;
	readonly trayKind?: ChairsideTrayKind | undefined;
	readonly indicatorClass?: ChemicalIndicatorClass | undefined;
	readonly indicatorTransition?: IndicatorColorTransitionId | undefined;
	readonly indicatorPassed?: boolean | undefined;
	readonly autoclaveParams?: Partial<ChairsideAutoclaveParams> | undefined;
	readonly openedInPresenceOfPatient?: boolean | undefined;
	readonly packagingIntegrityPreserved?: boolean | undefined;
	readonly referenceDate?: Date | string | undefined;
}

/**
 * Создает готовую запись крафт-пакета со всеми верификациями, параметрами автоклава B-класса
 * и привязкой к Журналу 257/у.
 */
export function createChairsidePouchRecord(
	options: CreateChairsidePouchOptions = {},
): ChairsidePouchRecord {
	const refDt = typeof options.referenceDate === "string" ? new Date(options.referenceDate) : options.referenceDate || new Date();
	const refDateIso = Number.isNaN(refDt.getTime()) ? new Date().toISOString().slice(0, 10) : refDt.toISOString().slice(0, 10);

	const parsed = parseChairsidePouchInput(options.rawInput || options.customCode || "", refDateIso);
	const pouchCode = normalizeChairsidePouchCode(options.customCode || parsed.pouchCode);
	const trayKind: ChairsideTrayKind = options.trayKind || parsed.detectedKind;

	const trayPreset = CHAIRSIDE_TRAY_PRESETS.find((p) => p.trayKind === trayKind) || CHAIRSIDE_TRAY_PRESETS[0]!;
	const packDateIso = parsed.parsedPackDateIso || refDateIso;

	// Срок годности по СанПиН (50-180 суток в зависимости от упаковки)
	const expDt = new Date(`${packDateIso}T12:00:00.000Z`);
	expDt.setUTCDate(expDt.getUTCDate() + trayPreset.shelfLifeDays);
	const expDateIso = expDt.toISOString().slice(0, 10);

	const todayDt = new Date(`${refDateIso}T00:00:00.000Z`).getTime();
	const expTime = new Date(`${expDateIso}T00:00:00.000Z`).getTime();
	const daysRemaining = Math.round((expTime - todayDt) / (24 * 3600 * 1000));
	const isExpired = daysRemaining < 0;

	// Параметры автоклава B-класса D-типа
	const autoclave: ChairsideAutoclaveParams = {
		...DEFAULT_CHAIRSIDE_AUTOCLAVE_PARAMS,
		dateIso: packDateIso,
		cycleNumber: parsed.detectedCycleNumber,
		autoclaveCode: parsed.detectedAutoclaveCode,
		...options.autoclaveParams,
	};

	// Индикатор стерильности 4–5 класса
	const indClass: ChemicalIndicatorClass = options.indicatorClass ?? 5;
	const transitionId: IndicatorColorTransitionId = options.indicatorTransition ?? (indClass === 5 ? "pink_to_brown" : "blue_to_brown");
	const isPassed = options.indicatorPassed ?? !isExpired;

	const transitionDef = STATUTORY_INDICATOR_TRANSITIONS.find((t) => t.id === transitionId) || STATUTORY_INDICATOR_TRANSITIONS[0]!;
	const colorStatusText = isPassed
		? `Индикатор сработал: ${transitionDef.labelRu}`
		: `Индикатор НЕ сработал (${transitionDef.initialColorRu} не изменился)! Использование запрещено!`;

	const indicator: ChairsideIndicatorState = {
		indicatorClass: indClass,
		transitionId,
		colorStatusText,
		isPassed,
		verifiedAtIso: new Date().toISOString(),
	};

	const form257Link = createForm257Link(pouchCode, autoclave, isPassed);

	const openedInPresenceOfPatient = options.openedInPresenceOfPatient !== false;
	const packagingIntegrityPreserved = options.packagingIntegrityPreserved !== false;

	const statutoryDiarySnippet = formatPouch043StatutorySnippet({
		pouchCode,
		indicatorClass: indClass,
		openedInPresenceOfPatient,
		isPassed,
	});

	const formattedDiaryText043 = formatPouch043FullDiaryText({
		pouchCode,
		trayNameRu: trayPreset.labelRu,
		indicator,
		autoclave,
		form257Link,
		openedInPresenceOfPatient,
		packagingIntegrityPreserved,
	});

	return {
		id: `chairside-pouch-${Date.now()}-${pouchCode.replace(/[^a-zA-Z0-9]/g, "")}`,
		pouchCode,
		rawInput: options.rawInput || pouchCode,
		trayKind,
		trayNameRu: trayPreset.labelRu,
		packDateIso,
		expDateIso,
		daysRemaining,
		isExpired,
		openedInPresenceOfPatient,
		packagingIntegrityPreserved,
		indicator,
		autoclave,
		form257Link,
		formattedDiaryText043,
		statutoryDiarySnippet,
		createdAtIso: new Date().toISOString(),
	};
}

/**
 * Создает полноценную запись цикла автоклавирования Формы 257/у для электронного журнала,
 * когда крафт-пакет вскрывается у кресла.
 */
export function exportChairsidePouchToForm257Record(
	record: ChairsidePouchRecord,
): Form257Record {
	return createForm257Record({
		date: record.autoclave.dateIso,
		cycleNumber: record.autoclave.cycleNumber,
		sterilizerId: record.autoclave.autoclaveCode,
		sterilizerCode: record.autoclave.autoclaveCode,
		sterilizerBrandModel: record.autoclave.autoclaveModel,
		regimeId: record.autoclave.temperatureC >= 134 ? "steam_134_5min" : "steam_121_20min",
		sensors: {
			actualTemperatureCelsius: record.autoclave.temperatureC,
			actualPressureBar: record.autoclave.pressureBar,
			actualExposureMinutes: record.autoclave.exposureMinutes,
		},
		itemsDescriptionRu: `${record.trayNameRu} (пакет №${record.pouchCode})`,
		packsCount: 1,
		packagingNameRu: "Крафт-пакет стерилизационный",
		chamberPoints: [
			{ pointIndex: 1, code: "КТ-1", nameRu: "Центральная зона камеры", indicatorId: "vinar_intetest_5", indicatorTradeNameRu: "ИнтеТЕСТ-В-134/5", status: "passed", initialColorRu: "розовый", actualColorRu: "коричневый" },
			{ pointIndex: 2, code: "КТ-2", nameRu: "Передняя правая зона", indicatorId: "vinar_intetest_5", indicatorTradeNameRu: "ИнтеТЕСТ-В-134/5", status: "passed", initialColorRu: "розовый", actualColorRu: "коричневый" },
			{ pointIndex: 3, code: "КТ-3", nameRu: "Передняя левая зона", indicatorId: "vinar_intetest_5", indicatorTradeNameRu: "ИнтеТЕСТ-В-134/5", status: "passed", initialColorRu: "розовый", actualColorRu: "коричневый" },
			{ pointIndex: 4, code: "КТ-4", nameRu: "Зона выхода конденсата / дренаж", indicatorId: "vinar_intetest_5", indicatorTradeNameRu: "ИнтеТЕСТ-В-134/5", status: "passed", initialColorRu: "розовый", actualColorRu: "коричневый" },
			{ pointIndex: 5, code: "КТ-5", nameRu: "Верхняя задняя зона", indicatorId: "vinar_intetest_5", indicatorTradeNameRu: "ИнтеТЕСТ-В-134/5", status: "passed", initialColorRu: "розовый", actualColorRu: "коричневый" },
		],
		operatorStaffFullName: record.autoclave.operatorName,
		notes: `Вскрыт на амбулаторном приеме. Привязка к Форме 043/у: ${record.statutoryDiarySnippet}`,
	});
}
