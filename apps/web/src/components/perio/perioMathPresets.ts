/**
 * perioMathPresets.ts — Пресеты нормы, гингивита и рецессии для периодонтограммы.
 * Архитектурный слой Layer 1: Presets (Мандат 8b, <= 120 строк).
 */

import {
	calculateClinicalAttachmentLevel,
	type PerioToothRecord,
} from "@dental/shared";
import type { PerioExpressPreset, PerioExpressPresetId } from "./perioMathTypes";

export const PERIO_EXPRESS_PRESETS: Record<PerioExpressPresetId, PerioExpressPreset> = {
	perio_norm_express: {
		id: "perio_norm_express",
		titleRu: "Норма пародонта",
		subtitleRu: "PSR 0 во всех секстантах, глубина <= 2 мм, BOP 0",
		icd10: "Z01.2",
		defaultProtocolRu: "Слизистая оболочка бледно-розовая, десневые сосочки плотные, патологические зубодесневые карманы не определяются, кровоточивость отсутствует. Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет. маргинальная десна бледно-розовая, глубина зубодесневой борозды 1-2 мм, кровоточивость отсутствует, подвижности зубов нет. Скрининг PSR: 0 во всех секстантах. Патологических карманов нет. Диагноз: Здоров (Z01.2).",
	},
	gingivitis_express: {
		id: "gingivitis_express",
		titleRu: "Гингивит",
		subtitleRu: "PSR 1-2, карманы < 3.5 мм, диффузная кровоточивость",
		icd10: "K05.1",
		defaultProtocolRu: "Пародонт: десна отечна, гиперемирована, валикообразно утолщена, диффузная кровоточивость при зондировании (BOP+), глубина десневых бороздок 2-3 мм (ложные карманы за счет отека десны, < 3.5 мм), зубодесневое прикрепление сохранено, наддесневой зубной камень, подвижности зубов нет. Скрининг PSR: 1-2. Диагноз: Хронический катаральный гингивит (K05.1).",
	},
	periodontitis_mild_express: {
		id: "periodontitis_mild_express",
		titleRu: "Пародонтит легкой степени",
		subtitleRu: "PSR 2-3, карманы 3.5–4.0 мм, BOP+, над- и поддесневой камень",
		icd10: "K05.30",
		defaultProtocolRu: "Пародонт: маргинальная десна отечна, умеренно гиперемирована, кровоточивость при зондировании (BOP+), пародонтальные карманы глубиной 3.5–4.0 мм без гноетечения (PSR 2-3), над- и поддесневые зубные отложения, потеря зубодесневого прикрепления CAL 1-2 мм. Патологическая подвижность зубов: 0-I ст. во фронтальном отделе. На рентгенограмме: резорбция кортикальной пластинки вершин межальвеолярных перегородок до 1/3 длины корней. Диагноз: Хронический пародонтит лёгкой степени (K05.30).",
	},
	periodontitis_moderate_express: {
		id: "periodontitis_moderate_express",
		titleRu: "Пародонтит средней степени",
		subtitleRu: "PSR 3, карманы до 5 мм",
		icd10: "K05.31",
		defaultProtocolRu: "Пародонт: глубина пародонтальных карманов 3.5–5.0 мм (PSR 3), десна гиперемирована с цианотичным оттенком, выраженная кровоточивость при зондировании, над- и поддесневой зубной камень, рецессия десны 1-2 мм, патологическая подвижность зубов I ст. Диагноз: Хронический генерализованный пародонтит средней степени (K05.31).",
	},
	periodontitis_severe_express: {
		id: "periodontitis_severe_express",
		titleRu: "Пародонтит тяжелой степени",
		subtitleRu: "PSR 4*, карманы >= 6 мм, гноетечение, подвижность II-III ст.",
		icd10: "K05.32",
		defaultProtocolRu: "Пародонт: десна застойно гиперемирована, цианотична, выраженная кровоточивость сосочков (BOP > 50%), глубокие пародонтальные карманы от 6 до 8 мм (PSR 4*) с серозно-гнойным экссудатом (гноетечение). Выраженная рецессия десны 2-4 мм с обнажением фуркаций (фуркационные дефекты II класса). Патологическая подвижность зубов II-III ст., веерообразное смещение резцов. На рентгенограмме: деструкция костной ткани более 1/2 длины корней. Диагноз: Хронический генерализованный пародонтит тяжёлой степени (K05.32).",
	},
	recession_express: {
		id: "recession_express",
		titleRu: "Рецессия десны",
		subtitleRu: "K06.0, рецессия десны 2–3 мм, CAL > PD, без карманов и воспаления",
		icd10: "K06.0",
		defaultProtocolRu: "Пародонт: апикальное смещение десневого края (рецессия десны) на 2–3 мм преимущественно с вестибулярной поверхности клыков и премоляров (I–II класс по Миллеру / Cairo). Обнажение шеек зубов, гиперчувствительность к термическим раздражителям. Патологические зубодесневые карманы отсутствуют (глубина зондирования 1–2 мм), кровоточивость при зондировании отсутствует (BOP 0%), десна бледно-розовая, плотная. Потеря прикрепления (CAL) 3–5 мм за счет рецессии. Диагноз: Рецессия десны (K06.0).",
	},
	pro_hygiene_express: {
		id: "pro_hygiene_express",
		titleRu: "Профгигиена полости рта",
		subtitleRu: "УЗ-удаление отложений + Air-Flow глицин + полировка + глубокое фторирование эмали",
		icd10: "Z01.2",
		code804n: "A16.07.051",
		defaultProtocolRu: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой + глубокое фторирование эмали",
	},
};

const makeSite = (depth: number, bop = false, gm = 0, plq = false, calc = false) => ({
	probingDepthMm: depth,
	gingivalMarginMm: gm,
	bleedingOnProbing: bop,
	suppuration: false,
	plaque: plq,
	calculus: calc,
	calMm: calculateClinicalAttachmentLevel(depth, gm),
});

export function applyHealthyPeriodontiumPreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const s = makeSite(2);
		return {
			...t, mobility: 0, furcation: 0,
			distoBuccal: s, midBuccal: s, mesioBuccal: s,
			distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyGingivitisPreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isLowerAnterior = [31, 32, 41, 42].includes(num);
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const depth = isLowerAnterior || isMolar ? 3 : 2;
		const s = makeSite(depth, true, 0, true, isLowerAnterior);
		return {
			...t, mobility: 0, furcation: 0,
			distoBuccal: s, midBuccal: s, mesioBuccal: s,
			distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyGingivalRecessionPreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const isCanineOrPremolar = [13, 14, 15, 23, 24, 25, 33, 34, 35, 43, 44, 45].includes(t.toothNumber);
		const gm = isCanineOrPremolar ? 3 : 2;
		const bSite = makeSite(2, false, gm);
		const lSite = makeSite(2, false, 0);
		return {
			...t, mobility: 0, furcation: 0,
			distoBuccal: bSite, midBuccal: bSite, mesioBuccal: bSite,
			distoLingual: lSite, midLingual: lSite, mesioLingual: lSite,
		};
	});
}
