/**
 * perioMath.ts — Экспресс-скрининг пародонта PSR / CPITN (ВОЗ / СтАР)
 * и 1-клик пресеты для Формы 043/у под Мандатами 8e, 8i, 8k, 8n.
 *
 * Ликвидация аппаратного симулятора: врач в перчатках не должен тыкать 192 точки карманов.
 * Экспресс-скрининг PSR по 6 секстантам:
 * - Код 0: глубина карманов < 3.5 мм, зубного камня нет, кровоточивости нет (Здоров).
 * - Код 1: глубина < 3.5 мм, кровоточивость при зондировании (Гингивит).
 * - Код 2: глубина < 3.5 мм, над- или поддесневой зубной камень.
 * - Код 3: карманы 3.5 – 5.5 мм (Пародонтит средней степени).
 * - Код 4: карманы > 5.5 мм (Пародонтит тяжелой степени).
 */

import {
	ALL_PERIO_TEETH,
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	formatPsrSextantsSummary,
	isFurcationEligibleTooth,
	PERIO_SITE_KEYS,
	type PerioChartSummary,
	type PerioToothRecord,
	PSR_SEXTANTS,
	type PsrSextantResult,
} from "@dental/shared";

export {
	ALL_PERIO_TEETH,
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	formatPsrSextantsSummary,
	isFurcationEligibleTooth,
	PERIO_SITE_KEYS,
	type PerioChartSummary,
	type PerioToothRecord,
	PSR_SEXTANTS,
	type PsrSextantResult,
};

export type PsrCode = 0 | 1 | 2 | 3 | 4;

export interface PsrCodeDefinition {
	readonly code: PsrCode;
	readonly labelRu: string;
	readonly shortTitleRu: string;
	readonly descriptionRu: string;
	readonly defaultDepthMm: number;
	readonly hasCalculus: boolean;
	readonly hasBop: boolean;
	readonly colorClass: string;
	readonly badgeClass: string;
}

export const PSR_CODE_DEFINITIONS: Record<PsrCode, PsrCodeDefinition> = {
	0: {
		code: 0,
		labelRu: "Код 0",
		shortTitleRu: "Здоров",
		descriptionRu:
			"Глубина карманов < 3.5 мм, зубного камня нет, кровоточивости нет (Здоров)",
		defaultDepthMm: 2,
		hasCalculus: false,
		hasBop: false,
		colorClass: "text-emerald-400 border-emerald-500/40 bg-emerald-500/15",
		badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
	},
	1: {
		code: 1,
		labelRu: "Код 1",
		shortTitleRu: "Гингивит (BOP)",
		descriptionRu:
			"Глубина < 3.5 мм, кровоточивость при зондировании (Гингивит)",
		defaultDepthMm: 3,
		hasCalculus: false,
		hasBop: true,
		colorClass: "text-amber-400 border-amber-500/40 bg-amber-500/15",
		badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
	},
	2: {
		code: 2,
		labelRu: "Код 2",
		shortTitleRu: "Зубной камень",
		descriptionRu: "Глубина < 3.5 мм, над- или поддесневой зубной камень",
		defaultDepthMm: 3,
		hasCalculus: true,
		hasBop: true,
		colorClass: "text-sky-400 border-sky-500/40 bg-sky-500/15",
		badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
	},
	3: {
		code: 3,
		labelRu: "Код 3",
		shortTitleRu: "Пародонтит ср. ст. (3.5-5.5 мм)",
		descriptionRu: "Карманы 3.5 – 5.5 мм (Пародонтит средней степени)",
		defaultDepthMm: 5,
		hasCalculus: true,
		hasBop: true,
		colorClass: "text-orange-400 border-orange-500/40 bg-orange-500/15",
		badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/30",
	},
	4: {
		code: 4,
		labelRu: "Код 4",
		shortTitleRu: "Пародонтит тяж. ст. (> 5.5 мм)",
		descriptionRu: "Карманы > 5.5 мм (Пародонтит тяжелой степени)",
		defaultDepthMm: 7,
		hasCalculus: true,
		hasBop: true,
		colorClass: "text-rose-400 border-rose-500/40 bg-rose-500/15",
		badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
	},
};

export type PerioExpressPresetId =
	| "perio_norm_express"
	| "gingivitis_express"
	| "periodontitis_mild_express"
	| "periodontitis_moderate_express"
	| "periodontitis_severe_express"
	| "pro_hygiene_express";

export interface PerioExpressPreset {
	readonly id: PerioExpressPresetId;
	readonly titleRu: string;
	readonly subtitleRu: string;
	readonly icd10: string;
	readonly defaultProtocolRu: string;
}

export const PERIO_EXPRESS_PRESETS: Record<
	PerioExpressPresetId,
	PerioExpressPreset
> = {
	perio_norm_express: {
		id: "perio_norm_express",
		titleRu: "Норма пародонта",
		subtitleRu: "PSR 0 во всех секстантах, глубина <= 2 мм, BOP 0",
		icd10: "Z01.2",
		defaultProtocolRu:
			"Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет. маргинальная десна бледно-розовая, глубина зубодесневой борозды 1-2 мм, кровоточивость отсутствует, подвижности зубов нет. Скрининг PSR: 0 во всех секстантах. Патологических карманов нет. Диагноз: Здоров (Z01.2).",
	},
	gingivitis_express: {
		id: "gingivitis_express",
		titleRu: "Гингивит",
		subtitleRu: "PSR 1-2, карманы < 3.5 мм, диффузная кровоточивость",
		icd10: "K05.1",
		defaultProtocolRu:
			"Пародонт: десна отечна, гиперемирована, валикообразно утолщена, диффузная кровоточивость при зондировании (BOP+), глубина десневых бороздок 2-3 мм (ложные карманы за счет отека десны, < 3.5 мм), зубодесневое прикрепление сохранено, наддесневой зубной камень, подвижности зубов нет. Скрининг PSR: 1-2. Диагноз: Хронический катаральный гингивит (K05.1).",
	},
	periodontitis_mild_express: {
		id: "periodontitis_mild_express",
		titleRu: "Пародонтит легкой степени",
		subtitleRu: "PSR 2-3, карманы 3.5–4.0 мм, BOP+, над- и поддесневой камень",
		icd10: "K05.30",
		defaultProtocolRu:
			"Пародонт: маргинальная десна отечна, умеренно гиперемирована, кровоточивость при зондировании (BOP+), пародонтальные карманы глубиной 3.5–4.0 мм без гноетечения (PSR 2-3), над- и поддесневые зубные отложения, потеря зубодесневого прикрепления CAL 1-2 мм. Патологическая подвижность зубов: 0-I ст. во фронтальном отделе. На рентгенограмме: резорбция кортикальной пластинки вершин межальвеолярных перегородок до 1/3 длины корней. Диагноз: Хронический пародонтит лёгкой степени (K05.30).",
	},
	periodontitis_moderate_express: {
		id: "periodontitis_moderate_express",
		titleRu: "Пародонтит средней степени",
		subtitleRu: "PSR 3, карманы до 5 мм",
		icd10: "K05.31",
		defaultProtocolRu:
			"Пародонт: глубина пародонтальных карманов 3.5–5.0 мм (PSR 3), десна гиперемирована с цианотичным оттенком, выраженная кровоточивость при зондировании, над- и поддесневой зубной камень, рецессия десны 1-2 мм, патологическая подвижность зубов I ст. Диагноз: Хронический генерализованный пародонтит средней степени (K05.31).",
	},
	periodontitis_severe_express: {
		id: "periodontitis_severe_express",
		titleRu: "Пародонтит тяжелой степени",
		subtitleRu: "PSR 4*, карманы >= 6 мм, гноетечение, подвижность II-III ст.",
		icd10: "K05.32",
		defaultProtocolRu:
			"Пародонт: десна застойно гиперемирована, цианотична, выраженная кровоточивость сосочков (BOP > 50%), глубокие пародонтальные карманы от 6 до 8 мм (PSR 4*) с серозно-гнойным экссудатом (гноетечение). Выраженная рецессия десны 2-4 мм с обнажением фуркаций (фуркационные дефекты II класса). Патологическая подвижность зубов II-III ст., веерообразное смещение резцов. На рентгенограмме: деструкция костной ткани более 1/2 длины корней. Диагноз: Хронический генерализованный пародонтит тяжёлой степени (K05.32).",
	},
	pro_hygiene_express: {
		id: "pro_hygiene_express",
		titleRu: "Профгигиена полости рта",
		subtitleRu: "УЗ-скейлинг + Air-Flow глицин + Detartrine + Bifluorid 12",
		icd10: "Z01.2",
		defaultProtocolRu:
			"Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12",
	},
};

/**
 * 1-Клик Пресет 1: Норма пародонта (PSR 0 во всех секстантах, глубина <= 2 мм, BOP 0).
 */
export function applyHealthyPeriodontiumPreset(
	teeth: readonly PerioToothRecord[],
): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const copy: PerioToothRecord = {
			...t,
			mobility: 0,
			furcation: 0,
			distoBuccal: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				suppuration: false,
				plaque: false,
				calculus: false,
				calMm: 2,
			},
			midBuccal: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				suppuration: false,
				plaque: false,
				calculus: false,
				calMm: 2,
			},
			mesioBuccal: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				suppuration: false,
				plaque: false,
				calculus: false,
				calMm: 2,
			},
			distoLingual: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				suppuration: false,
				plaque: false,
				calculus: false,
				calMm: 2,
			},
			midLingual: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				suppuration: false,
				plaque: false,
				calculus: false,
				calMm: 2,
			},
			mesioLingual: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				suppuration: false,
				plaque: false,
				calculus: false,
				calMm: 2,
			},
		};
		return copy;
	});
}

/**
 * 1-Клик Пресет 2: Гингивит (PSR 1-2, карманы < 3.5 мм, диффузная кровоточивость).
 */
export function applyGingivitisPreset(
	teeth: readonly PerioToothRecord[],
): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isLowerAnterior = [31, 32, 41, 42].includes(num);
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const depth = isLowerAnterior || isMolar ? 3 : 2;
		const hasCalculus = isLowerAnterior;

		const makeSite = () => ({
			probingDepthMm: depth,
			gingivalMarginMm: 0,
			bleedingOnProbing: true,
			suppuration: false,
			plaque: true,
			calculus: hasCalculus,
			calMm: depth,
		});

		const copy: PerioToothRecord = {
			...t,
			mobility: 0,
			furcation: 0,
			distoBuccal: makeSite(),
			midBuccal: makeSite(),
			mesioBuccal: makeSite(),
			distoLingual: makeSite(),
			midLingual: makeSite(),
			mesioLingual: makeSite(),
		};
		return copy;
	});
}

/**
 * 1-Клик Пресет 3: Пародонтит лёгкой степени (PSR 2-3, карманы 3.5–4 мм, CAL 1-2 мм).
 */
export function applyPeriodontitisMildPreset(
	teeth: readonly PerioToothRecord[],
): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const isLowerAnterior = [31, 32, 41, 42].includes(num);
		const depth = isMolar || isLowerAnterior ? 4 : 3;
		const gm = 0;
		const calMm = depth + gm;
		const mobility = isLowerAnterior ? 1 : 0;

		const makeSite = () => ({
			probingDepthMm: depth,
			gingivalMarginMm: gm,
			bleedingOnProbing: true,
			suppuration: false,
			plaque: true,
			calculus: true,
			calMm,
		});

		const copy: PerioToothRecord = {
			...t,
			mobility: mobility as 0 | 1 | 2 | 3,
			furcation: 0,
			distoBuccal: makeSite(),
			midBuccal: makeSite(),
			mesioBuccal: makeSite(),
			distoLingual: makeSite(),
			midLingual: makeSite(),
			mesioLingual: makeSite(),
		};
		return copy;
	});
}

/**
 * 1-Клик Пресет 4: Пародонтит средней степени (PSR 3, карманы до 5 мм).
 */
export function applyPeriodontitisModeratePreset(
	teeth: readonly PerioToothRecord[],
): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const isLowerAnterior = [31, 32, 41, 42].includes(num);
		const depth = isMolar ? 5 : 4;
		const gm = 1;
		const calMm = depth + gm;
		const mobility = isLowerAnterior ? 1 : 0;
		const furcation = isMolar && isFurcationEligibleTooth(num) ? 1 : 0;

		const makeSite = () => ({
			probingDepthMm: depth,
			gingivalMarginMm: gm,
			bleedingOnProbing: true,
			suppuration: false,
			plaque: true,
			calculus: true,
			calMm,
		});

		const copy: PerioToothRecord = {
			...t,
			mobility: mobility as 0 | 1 | 2 | 3,
			furcation: furcation as 0 | 1 | 2 | 3 | 4,
			distoBuccal: makeSite(),
			midBuccal: makeSite(),
			mesioBuccal: makeSite(),
			distoLingual: makeSite(),
			midLingual: makeSite(),
			mesioLingual: makeSite(),
		};
		return copy;
	});
}

/**
 * 1-Клик Пресет 5: Пародонтит тяжёлой степени (PSR 4*, карманы >= 6 мм, гноетечение, подвижность II-III).
 */
export function applyPeriodontitisSeverePreset(
	teeth: readonly PerioToothRecord[],
): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const isLowerAnterior = [31, 32, 41, 42].includes(num);
		const depth = isMolar ? 7 : isLowerAnterior ? 6 : 5;
		const gm = 2;
		const calMm = depth + gm;
		const mobility = isLowerAnterior ? 2 : isMolar ? 2 : 1;
		const furcation = isMolar && isFurcationEligibleTooth(num) ? 2 : 0;
		const suppuration = isMolar || isLowerAnterior;

		const makeSite = () => ({
			probingDepthMm: depth,
			gingivalMarginMm: gm,
			bleedingOnProbing: true,
			suppuration,
			plaque: true,
			calculus: true,
			calMm,
		});

		const copy: PerioToothRecord = {
			...t,
			mobility: mobility as 0 | 1 | 2 | 3,
			furcation: furcation as 0 | 1 | 2 | 3 | 4,
			distoBuccal: makeSite(),
			midBuccal: makeSite(),
			mesioBuccal: makeSite(),
			distoLingual: makeSite(),
			midLingual: makeSite(),
			mesioLingual: makeSite(),
		};
		return copy;
	});
}

/**
 * Применение кода PSR (0..4) к конкретному секстанту (S1..S6).
 */
export function applyPsrSextantCode(
	teeth: readonly PerioToothRecord[],
	sextantName: string,
	code: PsrCode,
	asterisk = false,
): PerioToothRecord[] {
	const sextant = PSR_SEXTANTS.find((s) => s.name === sextantName);
	if (!sextant) return [...teeth];

	const targetTeethSet = new Set<number>(sextant.teeth);

	let depth = 2;
	let bop = false;
	let calculus = false;

	switch (code) {
		case 0:
			depth = 2;
			bop = false;
			calculus = false;
			break;
		case 1:
			depth = 3;
			bop = true;
			calculus = false;
			break;
		case 2:
			depth = 3;
			bop = true;
			calculus = true;
			break;
		case 3:
			depth = 5;
			bop = true;
			calculus = true;
			break;
		case 4:
			depth = 7;
			bop = true;
			calculus = true;
			break;
	}

	return teeth.map((tooth) => {
		if (!targetTeethSet.has(tooth.toothNumber) || tooth.isMissing) {
			return tooth;
		}

		const mobility = asterisk ? (2 as const) : tooth.mobility;
		const furcation =
			asterisk && isFurcationEligibleTooth(tooth.toothNumber)
				? (1 as const)
				: tooth.furcation;

		const updated: PerioToothRecord = {
			...tooth,
			mobility,
			furcation,
		};

		for (const key of PERIO_SITE_KEYS) {
			const existing = tooth[key];
			const gm = existing?.gingivalMarginMm ?? 0;
			const calMm = calculateClinicalAttachmentLevel(depth, gm);
			updated[key] = {
				probingDepthMm: depth,
				gingivalMarginMm: gm,
				bleedingOnProbing: bop,
				suppuration: code === 4,
				plaque: code > 0,
				calculus,
				calMm,
			};
		}

		return updated;
	});
}

/**
 * Генерация чистого клинического текста для Формы 043/у.
 */
export function generatePsrDiaryProtocol(
	presetId: PerioExpressPresetId | "custom",
	customPsrSummary?: string,
	customNotes?: string,
): string {
	if (presetId in PERIO_EXPRESS_PRESETS) {
		const preset = PERIO_EXPRESS_PRESETS[presetId as PerioExpressPresetId];
		let text = preset.defaultProtocolRu;
		if (customNotes?.trim()) {
			text += `\nОсобые отметки: ${customNotes.trim()}`;
		}
		return text;
	}

	const summaryPart = customPsrSummary
		? `Скрининг PSR по секстантам (ВОЗ): ${customPsrSummary}.`
		: "";

	let text = `Пародонт: обследование по 6 секстантам PSR.\n${summaryPart}\nПародонтальный статус зафиксирован.`;
	if (customNotes?.trim()) {
		text += `\nОсобые отметки: ${customNotes.trim()}`;
	}
	return text;
}

/**
 * Вычисляет максимальный код PSR среди всех секстантов.
 */
export function getPsrMaxCode(psr: Record<string, PsrSextantResult>): PsrCode {
	let maxCode: PsrCode = 0;
	for (const key of Object.keys(psr)) {
		const item = psr[key];
		if (item && item.code > maxCode) {
			maxCode = item.code;
		}
	}
	return maxCode;
}

/**
 * Проверяет наличие символа * (патология фуркации или подвижности) в любом секстанте.
 */
export function hasPsrAsterisk(psr: Record<string, PsrSextantResult>): boolean {
	return Object.values(psr).some((item) => Boolean(item?.asterisk));
}
