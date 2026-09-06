/**
 * DENTE Dental CRM — Clinical Endodontic Protocol Engine (Мандаты 8e, 8i, 8k, 8n)
 *
 * Чистая клиническая бизнес-логика эндодонтии:
 * - CRM != процедурный тренажер реальности: ликвидация ручного вбивания десятых долей мм для каждого канала
 * - 1-клик протоколы обработки корневых каналов для Формы 043/у (Приказ МЗ РФ 834н):
 *     1. Первичное эндо: мехобработка ProTaper Gold (SX, S1, S2, F1, F2), ирригация 3% NaOCl + 17% EDTA с УЗ-активацией, временное пломбирование гидроксидом кальция (Metapex/Calcept) на 7–14 дней.
 *     2. Повторное эндо (перелечивание / ретритмент): распломбировка гуттаперчи D-RaCe / ProTaper Retreatment, ревизия устьев, временное пломбирование Ca(OH)2.
 *     3. Обтурация каналов: постоянная пломбировка методом латеральной компакции / горячей гуттаперчи (GuttaCore / System B) с эпоксидным силером (AH Plus).
 *     4. Экспресс-обтурация до физиологического апекса: подтверждено апекслокатором Apex 0.0 и контрольной радиовизиографией.
 * - Анатомическая норма рабочей длины каналов FDI (постоянные 11..48, молочные 51..85).
 * - Строгое соблюдение Мандата 8d: ноль мультяшных эмодзи в протоколах и документах.
 */

import { isValidFdiToothNumber } from "../emr/emrProtocolEngine.js";

export interface EndoCanalData {
	readonly id: string;
	canalName: string;
	referencePoint: string;
	workingLengthMm: number | string;
	masterApicalFile: string;
	taper: string;
	obturationTechnique: string;
	sealer?: string | undefined;
	notes?: string | undefined;
}

export interface EndoToothClinicalData {
	toothNumber?: number;
	toothTitle?: string;
	canals: EndoCanalData[];
	irrigation?: string;
	rotarySystem?: string;
	radiologyControl?: string;
	apexLocator?: string;
	updatedAt?: string;
}

export type EndoProtocolPresetId =
	| "primary_endo"
	| "retreatment_endo"
	| "obturation_permanent"
	| "express_apical"
	| "pulpitis_visit1"
	| "pulpitis_obturation"
	| "periodontitis_destructive"
	| "pulpitis_complete"
	| "periodontitis_temp"
	| "standard"
	| "caoh2";

export interface EndoProtocolPreset {
	readonly id: EndoProtocolPresetId;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly rotarySystem: string;
	readonly irrigation: string;
	readonly radiologyControl: string;
	readonly obturationTechnique: string;
	readonly sealer: string;
	readonly masterApicalFile: string;
	readonly taper: string;
	readonly notes: string;
}

/** Предустановленные варианты названий корневых каналов по анатомии */
export const CANAL_NAME_OPTIONS = [
	{ value: "MB1", label: "MB1 (Медиально-щечный 1)" },
	{ value: "MB2", label: "MB2 (Медиально-щечный 2)" },
	{ value: "DB", label: "DB (Дистально-щечный)" },
	{ value: "P", label: "P (Нёбный / Palatal)" },
	{ value: "MB", label: "MB (Медиально-щечный)" },
	{ value: "ML", label: "ML (Медиально-язычный)" },
	{ value: "D", label: "D (Дистальный)" },
	{ value: "DB_L", label: "DB (Дистально-щечный нижний)" },
	{ value: "DL", label: "DL (Дистально-язычный)" },
	{ value: "B", label: "B (Щечный / Buccal)" },
	{ value: "L", label: "L (Язычный / Lingual)" },
	{ value: "Main", label: "Основной / Прямой (Central)" },
] as const;

/** Реперные ориентиры измерения рабочей длины */
export const REFERENCE_POINT_OPTIONS = [
	"Щечный бугор (MB cusp)",
	"Дистально-щечный бугор (DB cusp)",
	"Нёбный бугор (P cusp)",
	"Медиально-язычный бугор (ML cusp)",
	"Дистально-язычный бугор (DL cusp)",
	"Язычный бугор (L cusp)",
	"Режущий край (Incisal edge)",
	"Бугор клыка (Canine cusp)",
] as const;

/** Мастер-апикальный файл (Master Apical File, ISO 15–50) */
export const MAF_ISO_OPTIONS = [
	"ISO 15 (#15 белый)",
	"ISO 20 (#20 жёлтый)",
	"ISO 25 (#25 красный)",
	"ISO 30 (#30 синий)",
	"ISO 35 (#35 зелёный)",
	"ISO 40 (#40 чёрный)",
	"ISO 45 (#45 белый)",
	"ISO 50 (#50 жёлтый)",
] as const;

/** Конусность инструмента (Taper) */
export const TAPER_OPTIONS = [
	".02 (Стандартная 2%)",
	".04 (Конусность 4%)",
	".06 (Конусность 6%)",
	".07 (Конусность 7%)",
	".08 (Конусность 8%)",
] as const;

/** Методики трёхмерной обтурации корневых каналов */
export const OBTURATION_TECHNIQUE_OPTIONS = [
	"Гуттаперча + Силер (AH Plus)",
	"Латеральная компакция холодной гуттаперчи",
	"Вертикальная конденсация разогретой гуттаперчи (System B / Elements)",
	"Горячая гуттаперча на носителе (GuttaCore)",
	"Биокерамика (BioRoot RCS / TotalFill)",
	"Моноштифт + биокерамический силер",
	"Временная обтурация Ca(OH)2 (Metapex / Calcept)",
] as const;

/** Быстрые пресеты длин каналов для ввода в 1 клик */
export const QUICK_LENGTH_PRESETS = [19, 20, 21, 21.5, 22, 22.5, 23, 24] as const;

// ─── 1-КЛИК КЛИНИЧЕСКИЕ ПРОТОКОЛЫ (МАНДАТЫ 8e, 8k, 8n) ──────────────────────

/**
 * 1-клик протокол: Первичное эндо
 * Мехобработка ProTaper Gold (SX, S1, S2, F1, F2), ирригация 3% NaOCl + 17% EDTA с УЗ-активацией,
 * временное пломбирование гидроксидом кальция (Metapex/Calcept) на 7–14 дней под дентин-пасту.
 */
export const PRIMARY_ENDO_PRESET: EndoProtocolPreset = {
	id: "primary_endo",
	titleRu: "Первичное эндо: ProTaper Gold + NaOCl/EDTA УЗ + Metapex/Calcept",
	shortLabelRu: "Первичное эндо",
	descriptionRu:
		"Мехобработка ProTaper Gold (SX, S1, S2, F1, F2), ирригация 3% NaOCl + 17% EDTA с ультразвуковой активацией, временное пломбирование гидроксидом кальция (Metapex/Calcept) на 7–14 дней",
	rotarySystem:
		"Мехобработка никель-титановой ротационной системой ProTaper Gold (SX, S1, S2, F1, F2) по методике Crown-Down",
	irrigation:
		"Обильная ирригация 3% NaOCl + 17% EDTA с ультразвуковой активацией (EndoActivator / IrriSafe)",
	radiologyControl:
		"Контрольная радиовизиография: временное пломбирование гидроксидом кальция (Metapex/Calcept) до апекса на 7–14 дней под герметичную дентин-пасту",
	obturationTechnique: "Временная обтурация Ca(OH)2 (Metapex / Calcept)",
	sealer: "Metapex / Calcept",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Первичное эндо: мехобработка ProTaper Gold (SX, S1, S2, F1, F2), ирригация 3% NaOCl + 17% EDTA с УЗ-активацией, временное пломбирование гидроксидом кальция (Metapex/Calcept) на 7–14 дней",
};

/**
 * 1-клик протокол: Повторное эндо (перелечивание / ретритмент)
 * Распломбировка гуттаперчи D-RaCe / ProTaper Retreatment, ревизия устьев, временное пломбирование.
 */
export const RETREATMENT_ENDO_PRESET: EndoProtocolPreset = {
	id: "retreatment_endo",
	titleRu: "Повторное эндо: распломбировка D-RaCe/Retreatment + ревизия + Ca(OH)2",
	shortLabelRu: "Повторное эндо (ретритмент)",
	descriptionRu:
		"Распломбировка гуттаперчи D-RaCe/ProTaper Retreatment, ревизия устьев, временное пломбирование гидроксидом кальция (Metapex/Calcept)",
	rotarySystem:
		"Распломбировка гуттаперчи системой D-RaCe / ProTaper Retreatment (D1, D2, D3), ревизия устьев корневых каналов, финишная инструментальная обработка ProTaper Gold",
	irrigation:
		"Обильная ирригация 3% NaOCl + 17% EDTA с ультразвуковой активацией, обильный лаваж физиологическим раствором",
	radiologyControl:
		"Контрольная радиовизиография: каналы распломбированы до апекса, ревизия устьев выполнена, временное пломбирование гидроксидом кальция (Metapex/Calcept) под герметичную повязку",
	obturationTechnique: "Временная обтурация Ca(OH)2 (Metapex / Calcept)",
	sealer: "Metapex / Calcept",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Повторное эндо (перелечивание): распломбировка гуттаперчи D-RaCe/ProTaper Retreatment, ревизия устьев, временное пломбирование гидроксидом кальция (Metapex/Calcept)",
};

/**
 * 1-клик протокол: Обтурация каналов (постоянная трехмерная обтурация)
 * Постоянная пломбировка методом латеральной компакции / горячей гуттаперчи (GuttaCore / System B) с эпоксидным силером (AH Plus).
 */
export const OBTURATION_PERMANENT_PRESET: EndoProtocolPreset = {
	id: "obturation_permanent",
	titleRu: "Обтурация каналов: латеральная компакция / горячая гуттаперча (GuttaCore/System B) + AH Plus",
	shortLabelRu: "Постоянная обтурация",
	descriptionRu:
		"Постоянная пломбировка методом латеральной компакции / горячей гуттаперчи (GuttaCore / System B) с эпоксидным силером (AH Plus), рентген-контроль гомогенно до апекса, без выхода за верхушку",
	rotarySystem:
		"Окончательное калибрование MAF Ni-Ti ProTaper Gold до F2 (25/.06) / WaveOne Gold Primary",
	irrigation:
		"3% NaOCl + 17% EDTA с ультразвуковой активацией, финальное высушивание стерильными бумажными штифтами",
	radiologyControl:
		"Контрольная радиовизиография: корневые каналы обтурированы плотно, гомогенно до физиологического апекса, без выведения за верхушку (без выхода за верхушку).",
	obturationTechnique:
		"Латеральная компакция / горячая гуттаперча (GuttaCore / System B) с эпоксидным силером (AH Plus)",
	sealer: "AH Plus",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Постоянное пломбирование: каналы высушены, обтурация гуттаперча + AH Plus, рентген-контроль гомогенно до апекса",
};

/**
 * 1-клик протокол: Экспресс-обтурация до апекса
 * Каналы обработаны и обтурированы до физиологического апекса (длина подтверждена апекслокатором Apex 0.0 и снимком).
 */
export const EXPRESS_APICAL_OBTURATION_PRESET: EndoProtocolPreset = {
	id: "express_apical",
	titleRu: "Обтурация до апекса: подтверждено апекслокатором Apex 0.0 и RVG",
	shortLabelRu: "Обтурированы до апекса",
	descriptionRu:
		"Каналы обработаны и обтурированы до физиологического апекса (длина подтверждена апекслокатором Apex 0.0 и контрольным снимком)",
	rotarySystem:
		"Машинная обработка Ni-Ti ProTaper Ultimate / WaveOne Gold до физиологического апекса",
	irrigation:
		"3% NaOCl + 17% EDTA с ультразвуковой активацией (активный протокол ирригации), высушивание бумажными штифтами",
	radiologyControl:
		"Контрольная радиовизиография: корневые каналы обтурированы плотно, гомогенно до физиологического апекса (длина подтверждена апекслокатором Apex 0.0 и контрольным снимком).",
	obturationTechnique: "Гуттаперча + Силер (AH Plus)",
	sealer: "AH Plus",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Каналы обработаны и обтурированы до физиологического апекса (длина подтверждена апекслокатором и снимком)",
};

// ─── Дополнительные совместимые пресеты ───────────────────────────────────────

export const PULPITIS_VISIT1_PRESET: EndoProtocolPreset = {
	id: "pulpitis_visit1",
	titleRu: "Пульпит (1-е посещение): экстирпация, ProTaper, NaOCl 3% + EDTA 17%, Calcept",
	shortLabelRu: "Пульпит 1 эт. (Calcept)",
	descriptionRu:
		"Экстирпация пульпы, мехобработка ProTaper/WaveOne, NaOCl 3% + ЭДТА 17%, временное пломбирование гидроксидом кальция Calcept под дентин-пасту",
	rotarySystem: "Машинная обработка NiTi ProTaper Ultimate / WaveOne Gold до MAF",
	irrigation: "3% NaOCl + 17% EDTA с ультразвуковой активацией (активный протокол ирригации)",
	radiologyControl:
		"Контрольная радиовизиография: временное пломбирование гидроксидом кальция Calcept до физиологического апекса под герметичную дентин-пасту.",
	obturationTechnique: "Временная обтурация Ca(OH)2 (Каласепт / Metapex)",
	sealer: "Calcept (гидроксид кальция)",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Пульпит (1-е посещение): экстирпация, мехобработка ProTaper/WaveOne, NaOCl 3% + ЭДТА 17%, временное пломбирование гидроксидом кальция Calcept под дентин-пасту",
};

export const PULPITIS_OBTURATION_PRESET: EndoProtocolPreset = {
	id: "pulpitis_obturation",
	titleRu: "Пульпит 2-е посещение: распломбирование временной пасты, постоянная обтурация AH Plus / BioRoot",
	shortLabelRu: "Пульпит 2 эт. (обтурация)",
	descriptionRu:
		"Распломбирование временной пасты, высушивание бумажными штифтами, постоянная обтурация гуттаперчей с силером AH Plus / BioRoot, RVG контроль",
	rotarySystem: "Машинная обработка NiTi ProTaper Ultimate / WaveOne Gold до MAF",
	irrigation: "3% NaOCl + 17% EDTA с ультразвуковой активацией, высушивание бумажными штифтами",
	radiologyControl:
		"Контрольная радиовизиография (RVG контроль): постоянная обтурация гуттаперчей методом латеральной конденсации с силером AH Plus / BioRoot до физиологического апекса.",
	obturationTechnique: "Латеральная компакция холодной гуттаперчи",
	sealer: "AH Plus / BioRoot",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Пульпит (2-е посещение) / Обтурация: распломбирование временной пасты, высушивание бумажными штифтами, постоянная обтурация гуттаперчей методом латеральной конденсации с силером AH Plus / BioRoot, RVG контроль",
};

export const PERIODONTITIS_DESTRUCTIVE_PRESET: EndoProtocolPreset = {
	id: "periodontitis_destructive",
	titleRu: "Периодонтит деструктивный: УЗ дезинфекция + пролонгированная паста Metapex/Calcept на 14 дней",
	shortLabelRu: "Периодонтит деструкт.",
	descriptionRu:
		"Механическая и ультразвуковая дезинфекция каналов, пролонгированная паста Metapex/Calcept на 14 дней",
	rotarySystem: "Ревизия и машинная обработка NiTi ProTaper / WaveOne с ультразвуковой дезинфекцией",
	irrigation:
		"3% NaOCl + 17% EDTA + 2% хлоргексидин с ультразвуковой активацией, просушивание бумажными штифтами",
	radiologyControl:
		"Контрольная радиовизиография: пролонгированная паста Metapex/Calcept введена плотно до верхушки на 14 дней, герметичная повязка.",
	obturationTechnique: "Временная обтурация Ca(OH)2 (Каласепт / Metapex)",
	sealer: "Metapex / Calcept",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Периодонтит (деструктивный): механическая и ультразвуковая дезинфекция каналов, пролонгированная паста Metapex/Calcept на 14 дней",
};

export const PULPITIS_COMPLETE_PRESET: EndoProtocolPreset = {
	id: "pulpitis_complete",
	titleRu: "Пульпит (полный цикл): экстирпация, NaOCl 3%, ProTaper F2, латеральная компакция AH Plus",
	shortLabelRu: "Пульпит (ProTaper F2)",
	descriptionRu:
		"Экстирпация пульпы, медикаментозная обработка NaOCl 3%, ProTaper Gold F2, латеральная компакция AH Plus + гуттаперча, норма",
	rotarySystem: "Машинная обработка NiTi ProTaper Gold до F2 (25.06) / WaveOne Gold Primary",
	irrigation: "3% NaOCl + 17% EDTA с ультразвуковой активацией (активный протокол ирригации)",
	radiologyControl:
		"Контрольная радиовизиография: корневые каналы обтурированы плотно, гомогенно до верхушки, патологических изменений в периапикальных тканях нет.",
	obturationTechnique: "Латеральная компакция холодной гуттаперчи",
	sealer: "AH Plus",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Пульпит: экстирпация пульпы, медикаментозная обработка NaOCl 3%, ProTaper Gold F2, латеральная компакция AH Plus + гуттаперча, норма",
};

export const PERIODONTITIS_TEMP_PRESET: EndoProtocolPreset = {
	id: "periodontitis_temp",
	titleRu: "Периодонтит 1 посещение: распломбировка, УЗ-активация NaOCl, временное вложение Ca(OH)2 Каласепт на 14 дней",
	shortLabelRu: "Периодонтит: Каласепт Ca(OH)2",
	descriptionRu:
		"Периодонтит 1 посещение: распломбировка, УЗ-активация NaOCl, временное вложение гидроокиси кальция Каласепт на 14 дней",
	rotarySystem: "Ревизия / машинная обработка NiTi ProTaper Retreatment D1-D3 с УЗ-активацией",
	irrigation: "3% NaOCl + 17% EDTA с ультразвуковой активацией, обильное промывание 0.9% NaCl",
	radiologyControl:
		"Контрольная радиовизиография: лечебная паста Ca(OH)2 выведена на всю рабочую длину до апекса, герметичная повязка.",
	obturationTechnique: "Временная обтурация Ca(OH)2 (Каласепт / Metapex)",
	sealer: "Каласепт (гидроксид кальция)",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes:
		"Периодонтит 1 посещение: распломбировка, УЗ-активация NaOCl, временное вложение гидроокиси кальция Каласепт на 14 дней",
};

export const STANDARD_ENDO_PRESET: EndoProtocolPreset = {
	id: "standard",
	titleRu: "Стандартный протокол: ProTaper Ultimate + NaOCl 3% + AH Plus",
	shortLabelRu: "Стандарт (AH Plus)",
	descriptionRu:
		"Стандартная машинная обработка Ni-Ti ProTaper Ultimate / WaveOne Gold, NaOCl 3% + EDTA, обтурация гуттаперча + AH Plus",
	rotarySystem: "Машинная обработка NiTi ProTaper Ultimate / WaveOne Gold до MAF",
	irrigation: "3% NaOCl + 17% EDTA с ультразвуковой активацией (активный протокол ирригации)",
	radiologyControl:
		"Контрольная визиография: корневые каналы обтурированы плотно, гомогенно до физиологического апекса, без выведения материала за верхушку.",
	obturationTechnique: "Гуттаперча + Силер (AH Plus)",
	sealer: "AH Plus",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes: "Стандартный эндо-протокол: ProTaper + NaOCl + AH Plus",
};

export const CAOH2_ENDO_PRESET: EndoProtocolPreset = {
	id: "caoh2",
	titleRu: "Лечебная повязка Ca(OH)2 (Каласепт / Metapex)",
	shortLabelRu: "Повязка Ca(OH)2",
	descriptionRu:
		"Машинная обработка, антисептический лаваж, временное пломбирование гидроксидом кальция Ca(OH)2",
	rotarySystem: "Машинная обработка NiTi ProTaper Ultimate / WaveOne Gold до MAF",
	irrigation: "3% NaOCl + 17% EDTA с ультразвуковой активацией, обильное промывание 0.9% NaCl",
	radiologyControl:
		"Контрольная радиовизиография: лечебная паста Ca(OH)2 выведена на всю рабочую длину до апекса, герметичная повязка.",
	obturationTechnique: "Временная обтурация Ca(OH)2 (Каласепт / Metapex)",
	sealer: "Каласепт (гидроксид кальция)",
	masterApicalFile: "ISO 25 (#25 красный)",
	taper: ".06 (Конусность 6%)",
	notes: "Временная лечебная повязка гидроксидом кальция Ca(OH)2 (Каласепт / Metapex)",
};

export const ALL_ENDO_PROTOCOL_PRESETS: readonly EndoProtocolPreset[] = [
	PRIMARY_ENDO_PRESET,
	RETREATMENT_ENDO_PRESET,
	OBTURATION_PERMANENT_PRESET,
	EXPRESS_APICAL_OBTURATION_PRESET,
	PULPITIS_VISIT1_PRESET,
	PULPITIS_OBTURATION_PRESET,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PERIODONTITIS_TEMP_PRESET,
	STANDARD_ENDO_PRESET,
	CAOH2_ENDO_PRESET,
];

// ─── АНАТОМИЧЕСКАЯ РАБОЧАЯ ДЛИНА ПО FDI (БЕЗ РУЧНОГО ТРЕНАЖЕРА) ─────────────

/**
 * Анатомическая рабочая длина по номеру зуба FDI и названию канала:
 * - Резцы (11, 12, 21, 22, 31, 32, 41, 42): 22.0 мм
 * - Клыки (13, 23, 33, 43): 25.0 мм
 * - Премоляры (14, 15, 24, 25, 34, 35, 44, 45): 21.0 мм
 * - Верхние моляры (16-18, 26-28):
 *     • Нёбный (P / Palatal): 22.0 мм
 *     • Щечные (MB1, MB2, DB, B): 20.0 мм
 * - Нижние моляры (36-38, 46-48):
 *     • Щечные / медиальные (MB, ML): 20.0 мм
 *     • Дистальные (D, DL): 21.0 мм
 * - Временные (молочные) зубы (51..85):
 *     • Резцы (51, 52, 61, 62, 71, 72, 81, 82): 16.0 мм
 *     • Клыки (53, 63, 73, 83): 18.0 мм
 *     • Моляры (54, 55, 64, 65, 74, 75, 84, 85): 16.5 мм
 */
export function getAnatomicalWorkingLength(toothNumber: number, canalName?: string): number {
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const normCanal = (canalName || "").toUpperCase().trim();
	const isPrimary = quadrant >= 5 && quadrant <= 8;

	// Временные (молочные) зубы (51..85)
	if (isPrimary) {
		if (pos === 3) return 18.0;
		if (pos === 1 || pos === 2) return 16.0;
		if (pos === 4 || pos === 5) return 16.5;
		return 16.5;
	}

	// Постоянные зубы (11..48)
	if (pos === 3) return 25.0; // Клыки
	if (pos === 1 || pos === 2) return 22.0; // Резцы
	if (pos === 4 || pos === 5) return 21.0; // Премоляры

	// Моляры (6, 7, 8)
	if (pos === 6 || pos === 7 || pos === 8) {
		const isUpper = quadrant === 1 || quadrant === 2;
		if (isUpper) {
			if (
				normCanal === "P" ||
				normCanal.includes("PALAT") ||
				normCanal.includes("НЕБ") ||
				normCanal.includes("НЁБ")
			) {
				return 22.0;
			}
			return 20.0;
		}
		if (normCanal === "D" || normCanal === "DL" || normCanal.includes("ДИСТ")) {
			return 21.0;
		}
		return 20.0;
	}

	return 21.0;
}

/**
 * Получить анатомический набор каналов по умолчанию на основе номера зуба FDI.
 */
export function getDefaultCanalsForTooth(toothNumber: number): EndoCanalData[] {
	if (!isValidFdiToothNumber(toothNumber)) {
		return [
			{
				id: `canal-${Date.now()}-1`,
				canalName: "Main",
				referencePoint: "Режущий край (Incisal edge)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isPrimary = quadrant >= 5 && quadrant <= 8;
	const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
	const isLower = quadrant === 3 || quadrant === 4 || quadrant === 7 || quadrant === 8;

	// Верхние моляры (16-18, 26-28, 54-55, 64-65) -> MB1, MB2, DB, P
	if (isUpper && (pos === 6 || pos === 7 || pos === 8 || (isPrimary && (pos === 4 || pos === 5)))) {
		return [
			{
				id: `canal-${toothNumber}-mb1`,
				canalName: "MB1",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-mb2`,
				canalName: "MB2",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 20.0,
				masterApicalFile: "ISO 20 (#20 жёлтый)",
				taper: ".04 (Конусность 4%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-db`,
				canalName: "DB",
				referencePoint: "Дистально-щечный бугор (DB cusp)",
				workingLengthMm: 20.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-p`,
				canalName: "P",
				referencePoint: "Нёбный бугор (P cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Нижние моляры (36-38, 46-48, 74-75, 84-85) -> MB, ML, D
	if (isLower && (pos === 6 || pos === 7 || pos === 8 || (isPrimary && (pos === 4 || pos === 5)))) {
		return [
			{
				id: `canal-${toothNumber}-mb`,
				canalName: "MB",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-ml`,
				canalName: "ML",
				referencePoint: "Медиально-язычный бугор (ML cusp)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-d`,
				canalName: "D",
				referencePoint: "Дистально-щечный бугор (DB cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Верхние премоляры (14, 15, 24, 25) -> B, P
	if (isUpper && (pos === 4 || pos === 5)) {
		return [
			{
				id: `canal-${toothNumber}-b`,
				canalName: "B",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-p`,
				canalName: "P",
				referencePoint: "Нёбный бугор (P cusp)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Нижние премоляры (34, 35, 44, 45) -> B
	if (isLower && (pos === 4 || pos === 5)) {
		return [
			{
				id: `canal-${toothNumber}-b`,
				canalName: "B",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Фронтальная группа: резцы и клыки (11–13, 21–23, 31–33, 41–43)
	const isCanine = pos === 3;
	return [
		{
			id: `canal-${toothNumber}-main`,
			canalName: "Main",
			referencePoint: isCanine
				? "Бугор клыка (Canine cusp)"
				: "Режущий край (Incisal edge)",
			workingLengthMm: isCanine ? 24.0 : 21.0,
			masterApicalFile: isCanine
				? "ISO 35 (#35 зелёный)"
				: "ISO 30 (#30 синий)",
			taper: ".06 (Конусность 6%)",
			obturationTechnique: "Гуттаперча + Силер (AH Plus)",
		},
	];
}

/**
 * 1-клик автозаполнение анатомической рабочей длины всех каналов для зуба
 */
export function applyAnatomicalWorkingLengths(
	canals: readonly EndoCanalData[],
	toothNumber: number,
): EndoCanalData[] {
	const defaultCanals = getDefaultCanalsForTooth(toothNumber);
	const targetCanals = canals.length > 0 ? canals : defaultCanals;
	return targetCanals.map((c) => ({
		...c,
		workingLengthMm: getAnatomicalWorkingLength(toothNumber, c.canalName),
	}));
}

/**
 * Универсальный применитель любого 1-клик пресета к списку каналов.
 */
export function applyEndoProtocolPreset(
	preset: EndoProtocolPreset,
	canals: readonly EndoCanalData[],
	toothNumber: number,
): {
	canals: EndoCanalData[];
	irrigation: string;
	rotarySystem: string;
	radiologyControl: string;
} {
	const defaultCanals = getDefaultCanalsForTooth(toothNumber);
	const targetCanals = canals.length > 0 ? canals : defaultCanals;

	const updatedCanals: EndoCanalData[] = targetCanals.map((c, idx) => {
		const def = defaultCanals[idx] || defaultCanals[0];
		const defLength = getAnatomicalWorkingLength(toothNumber, c.canalName) || def?.workingLengthMm || 21.0;
		return {
			...c,
			workingLengthMm: c.workingLengthMm || defLength,
			masterApicalFile: preset.masterApicalFile || c.masterApicalFile || "ISO 25 (#25 красный)",
			taper: preset.taper || c.taper || ".06 (Конусность 6%)",
			referencePoint: c.referencePoint || def?.referencePoint || "Реперный ориентир",
			obturationTechnique: preset.obturationTechnique,
			sealer: preset.sealer,
			notes: preset.notes,
		};
	});

	return {
		canals: updatedCanals,
		irrigation: preset.irrigation,
		rotarySystem: preset.rotarySystem,
		radiologyControl: preset.radiologyControl,
	};
}

export function applyPrimaryEndoProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(PRIMARY_ENDO_PRESET, canals, toothNumber);
}

export function applyRetreatmentEndoProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(RETREATMENT_ENDO_PRESET, canals, toothNumber);
}

export function applyObturationPermanentProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(OBTURATION_PERMANENT_PRESET, canals, toothNumber);
}

export function applyExpressApicalEndoProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(EXPRESS_APICAL_OBTURATION_PRESET, canals, toothNumber);
}

export function applyPulpitisVisit1Protocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(PULPITIS_VISIT1_PRESET, canals, toothNumber);
}

export function applyPulpitisObturationProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(PULPITIS_OBTURATION_PRESET, canals, toothNumber);
}

export function applyPeriodontitisDestructiveProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(PERIODONTITIS_DESTRUCTIVE_PRESET, canals, toothNumber);
}

export function applyPulpitisProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(PULPITIS_COMPLETE_PRESET, canals, toothNumber);
}

export function applyPulpitisCompleteProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(PULPITIS_COMPLETE_PRESET, canals, toothNumber);
}

export function applyPeriodontitisTempProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(PERIODONTITIS_TEMP_PRESET, canals, toothNumber);
}

export function applyStandardEndoProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(STANDARD_ENDO_PRESET, canals, toothNumber);
}

export function applyCaOh2EndoProtocol(
	canals: readonly EndoCanalData[],
	toothNumber: number,
) {
	return applyEndoProtocolPreset(CAOH2_ENDO_PRESET, canals, toothNumber);
}

// ─── ГЕНЕРАЦИЯ ОФИЦИАЛЬНОЙ ДОКУМЕНТАЦИИ 043/у (БЕЗ ЭМОДЗИ) ───────────────────

/**
 * Генерация текстовой таблицы учета рабочей длины корневых каналов для Формы 043/у.
 * Строго официальный стиль (ноль эмодзи).
 */
export function generateEndoCanalsTable043(canals: readonly EndoCanalData[]): string {
	const header = [
		"┌──────────────┬─────────────────────────────┬─────────────┬─────────────┬──────────────────────────────┐",
		"│ Канал        │ Реперный ориентир           │ Длина (WL)  │ Мастер-файл │ Метод обтурации / Силер      │",
		"├──────────────┼─────────────────────────────┼─────────────┼─────────────┼──────────────────────────────┤",
	];

	const rows = canals.map((c) => {
		const mafMatch = String(c.masterApicalFile).match(/(?:ISO\s*\d+|#\d+|\d+)/i);
		const mafClean = mafMatch ? mafMatch[0] : c.masterApicalFile;
		const taperMatch = String(c.taper).match(/\.\d+/);
		const taperClean = taperMatch ? taperMatch[0] : c.taper;
		const mafFormatted = `${mafClean || "—"}/${taperClean || ""}`.trim();
		const lengthStr = c.workingLengthMm ? `${c.workingLengthMm} мм` : "—";
		const obt = c.obturationTechnique
			? `${c.obturationTechnique}${c.sealer ? ` + ${c.sealer}` : ""}`
			: "—";

		const colCanal = (c.canalName || "—").padEnd(12);
		const colRef = (c.referencePoint || "—").slice(0, 27).padEnd(27);
		const colWl = lengthStr.padEnd(11);
		const colMaf = mafFormatted.padEnd(11);
		const colObt = obt.slice(0, 28).padEnd(28);

		return `│ ${colCanal} │ ${colRef} │ ${colWl} │ ${colMaf} │ ${colObt} │`;
	});

	const footer = "└──────────────┴─────────────────────────────┴─────────────┴─────────────┴──────────────────────────────┘";

	return [
		"ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ (ЭНДОДОНТИЯ 043/у):",
		...header,
		...rows,
		footer,
	].join("\n");
}

export function formatEndoCanalsTable043(
	canals: readonly EndoCanalData[],
	options?: {
		readonly apexLocatorModel?: string | undefined;
		readonly radiologyControl?: string | undefined;
	},
): string {
	const table = generateEndoCanalsTable043(canals);
	const apex = options?.apexLocatorModel || "Электронный апекслокатор (Apex 0.0)";
	const rad = options?.radiologyControl || "Контрольная визиография: каналы обтурированы гомогенно до физиологического апекса";

	return [
		table,
		`Контроль рабочей длины: ${apex}`,
		`Рентгенологический контроль: ${rad}`,
	].join("\n");
}

/**
 * Генерация структурированного клинического текста протокола для Формы 043/у (Приказ МЗ РФ 834н).
 * Гарантирует отсутствие эмодзи, точность медицинских формулировок и стандарты СтАР.
 */
export function generateEndoProtocol043(params: {
	toothNumber: number;
	toothTitle?: string;
	canals: readonly EndoCanalData[];
	irrigation?: string;
	rotarySystem?: string;
	apexLocator?: string;
	radiologyControl?: string;
}): string {
	const { toothNumber, canals } = params;
	const toothDisplay = params.toothTitle || `Зуб ${toothNumber}`;

	const canalLines = canals.map((c) => {
		const mafMatch = String(c.masterApicalFile).match(/(?:ISO\s*\d+|#\d+|\d+)/i);
		const mafClean = mafMatch ? mafMatch[0] : c.masterApicalFile;
		const taperMatch = String(c.taper).match(/\.\d+/);
		const taperClean = taperMatch ? taperMatch[0] : c.taper;
		const lengthStr = c.workingLengthMm ? `${c.workingLengthMm} мм` : "—";
		const refStr = c.referencePoint ? ` (репер: ${c.referencePoint})` : "";
		const sealerStr = c.sealer ? `, силер: ${c.sealer}` : "";
		const notesStr = c.notes ? ` [${c.notes}]` : "";
		return `  • Канал ${c.canalName}${refStr}: WL = ${lengthStr} (апекслокатор), MAF = ${mafClean}/${taperClean}, обтурация: ${c.obturationTechnique}${sealerStr}${notesStr}`;
	});

	const table = generateEndoCanalsTable043(canals);
	const irrigation =
		params.irrigation ||
		"3% NaOCl + 17% EDTA с ультразвуковой активацией (активный протокол ирригации)";
	const radiology =
		params.radiologyControl ||
		"Контрольная визиография: корневые каналы обтурированы плотно, гомогенно до физиологического апекса, без выведения материала за верхушку.";
	const apexLocatorText = params.apexLocator || "Электронный апекслокатор (Apex 0.0)";
	const rotary =
		params.rotarySystem ||
		"Машинная обработка NiTi ProTaper Ultimate / WaveOne Gold до MAF";

	return [
		`ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ (${toothDisplay}):`,
		"Изоляция операционного поля: коффердам. Препарирование эндодонтического доступа, раскрытие устьев каналов.",
		`Инструментальная обработка: ${rotary}.`,
		"Параметры инструментальной и медикаментозной обработки каналов:",
		...canalLines,
		"",
		table,
		"",
		`Апекслокация и контроль длины: ${apexLocatorText}.`,
		`Медикаментозная обработка: ${irrigation}. Высушивание бумажными штифтами.`,
		`Рентгенологический контроль: ${radiology}`,
	].join("\n");
}
