/**
 * DENTE Dental CRM — Endodontic Irrigation & Obturation Protocol Rules (Layer 1)
 * @dental/shared/clinical/endo/irrigationObturationRules.ts
 *
 * Клинические протоколы ирригации, временной и постоянной обтурации корневых каналов:
 * - 1-клик пресеты протоколов обработки для Формы 043/у (Приказ МЗ РФ 834н):
 *     1. Первичное эндо: ProTaper Gold + NaOCl 3% / EDTA 17% с УЗ + Metapex/Calcept
 *     2. Повторное эндо (ретритмент): распломбировка D-RaCe/Retreatment + ревизия + Ca(OH)2
 *     3. Постоянная обтурация: латеральная/вертикальная конденсация + AH Plus
 *     4. Экспресс-обтурация до апекса по апекслокатору Apex 0.0 и контрольной RVG
 *     5. Сопутствующие протоколы (пульпит визит 1, обтурация, деструктивный периодонтит, Ca(OH)2)
 * - Форматирование документации Формы 043/у (псевдографические таблицы без эмодзи)
 * - Памятка пациенту после эндодонтического лечения (официальный клинический стиль)
 */

import {
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
} from "./canalAnatomyRules.js";
import type {
	EndoCanalData,
	EndoPatientMemoParams,
	EndoProtocolPreset,
} from "./types.js";

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

// ─── УНИВЕРСАЛЬНЫЕ ПРИМЕНИТЕЛИ ПРЕСЕТОВ ─────────────────────────────────────

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
	/**
	 * @deprecated Use radiologyControl instead.
	 */
	xrayControl?: string;
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
		params.xrayControl ||
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

// ─── 1-КЛИК ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ ЛЕЧЕНИЯ КАНАЛОВ (МАНДАТЫ 8e, 8k, 8n) ───────

/**
 * 1-клик генерация структурированной памятки пациенту после эндодонтического лечения (Мандаты 8e, 8k, 8n)
 * Для мессенджеров (WhatsApp / Telegram) и печати А4.
 * Строго официальный тон без мультяшных эмодзи (Мандат 8d п. 7).
 */
export function formatEndoPatientMemo(params: EndoPatientMemoParams): string {
	const clinicName = params.clinicName.trim() || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone ? params.clinicPhone.trim() : "";
	const patientName = params.patientName.trim() || "Пациент";
	const doctorName = params.doctorName.trim() || "Врач-стоматолог-терапевт (эндодонтист)";
	const date = params.date || new Date().toLocaleDateString("ru-RU");
	const toothName = params.toothAnatomicalNameRu
		? `${params.toothNumber} (${params.toothAnatomicalNameRu})`
		: `зуб ${params.toothNumber}`;
	const stage = params.isPermanentObturation
		? "Постоянная трёхмерная обтурация корневых каналов гуттаперчей с герметиком"
		: "Антисептическая обработка каналов и временное пломбирование гидроксидом кальция Ca(OH)2";
	const nextVisit = params.nextVisitDays
		? `${params.nextVisitDays}`
		: params.isPermanentObturation
			? "через 10-14 дней (контрольный снимок и постоянная реставрация/коронка)"
			: "через 10-14 дней для замены лекарства или постоянной пломбировки каналов";

	return [
		`Памятка пациенту после эндодонтического лечения корневых каналов (клиника «${clinicName}»):`,
		`Пациент: ${patientName}`,
		`Лечащий врач: ${doctorName}`,
		`Дата приёма: ${date}`,
		`Пролеченный зуб: ${toothName}`,
		`Этап лечения: ${stage}`,
		`Памятка и правила ухода:`,
		`1. Не принимайте пищу в течение 2 часов до полного затвердевания временной пломбы.`,
		`2. Не нагружайте зуб твёрдой или липкой пищей (сухари, орехи, ириски) во избежание скола стенок зуба до покрытия коронкой.`,
		`3. Умеренная болезненность при накусывании в течение 2–5 дней является естественной реакцией тканей периодонта на механическую и медикаментозную обработку. При дискомфорте примите назначенное врачом обезболивающее средство (Парацетамол / Ибупрофен).`,
		`4. Срок следующего визита: ${nextVisit}.`,
		clinicPhone
			? `5. При появлении отёка десны или пульсирующей боли немедленно свяжитесь с клиникой: ${clinicPhone}.`
			: `5. При появлении отёка десны или пульсирующей боли немедленно свяжитесь с клиникой.`,
	].join("\n");
}
