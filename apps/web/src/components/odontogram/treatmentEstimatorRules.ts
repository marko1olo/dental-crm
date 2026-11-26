/*
 * treatmentEstimatorRules.ts — Правила сопоставления состояний зубов, FDI-коды и логика сменного прикуса.
 * Мандаты 8b, 8e: <= 800 строк, модульность, чистота.
 */

import { isValidFdiToothNumber } from "@dental/shared";
import {
	PLAN_SERVICE_RULES,
	type PlanServiceRule,
} from "../treatment-plans/planPricing";

/**
 * Ключ автоподбора. Это НЕ идентификатор услуги прайса и на сервер он не
 * уходит: он существует, чтобы отличать «имплантат» от «хирургического
 * шаблона» на одном и том же зубе, когда ни у одной из услуг нет позиции
 * прайса и `priceId` у обеих равен null.
 */
export type EstimatorSuggestionKey =
	| "caries"
	| "pulpitis"
	| "periodontitis"
	| "retained"
	| "extraction"
	| "implant"
	| "implantGuide"
	| "crown"
	| "bridge"
	| "veneer"
	| "inlay"
	| "denture"
	| "hygiene"
	| "perio"
	| "resection"
	| "anesthesia"
	| "isolation"
	| "radiology";

/** Правило автоподбора: что искать в прайсе и на какой этап ставить. */
export interface EstimatorRule {
	readonly key: EstimatorSuggestionKey;
	/** I — терапия, II — хирургия, III — ортопедия. */
	readonly phase: number;
	/** Что искать в прайсе. Берётся из общего модуля или каталога правил. */
	readonly match: PlanServiceRule;
}

/**
 * Хирургический шаблон — единственное правило, которого в общем модуле нет:
 * там одно правило на состояние зуба, а планируемый имплантат даёт ДВЕ строки.
 */
export const SURGICAL_GUIDE_RULE: PlanServiceRule = {
	category: "surgery",
	keywords: ["шаблон", "навигацион"],
	humanName: "хирургический шаблон",
};

const EXTENDED_PATHOLOGY_RULES: Record<string, PlanServiceRule> = {
	extraction: {
		category: "surgery",
		keywords: ["удаление", "экстракция", "корень"],
		humanName: "удаление зуба / корня",
	},
	resection: {
		category: "surgery",
		keywords: ["резекц", "цистэкт", "киста"],
		humanName: "резекция верхушки корня / цистэктомия",
	},
	bridge: {
		category: "prosthetics",
		keywords: ["мост", "мостовид", "коронка"],
		humanName: "мостовидный протез",
	},
	veneer: {
		category: "prosthetics",
		keywords: ["винил", "винир", "керамич"],
		humanName: "керамический винир",
	},
	inlay: {
		category: "prosthetics",
		keywords: ["вкладк", "штифт"],
		humanName: "восстановительная вкладка / штифт",
	},
	denture: {
		category: "prosthetics",
		keywords: ["протез", "съемн", "бюгель"],
		humanName: "съёмное протезирование",
	},
	hygiene: {
		category: "therapy",
		keywords: ["гигиен", "ультразвук", "чистк", "камень"],
		humanName: "профессиональная гигиена / снятие отложений",
	},
	perio: {
		category: "therapy",
		keywords: ["пародонт", "вектор", "кюретаж", "десн", "шинир"],
		humanName: "пародонтологическое лечение",
	},
};

/**
 * Молочный зуб по FDI — код больше 50 (51–55, 61–65, 71–75, 81–85).
 */
export const FIRST_DECIDUOUS_FDI_CODE = 51;

export function isDeciduousFdiToothNumber(value: number): boolean {
	return isValidFdiToothNumber(value) && value >= FIRST_DECIDUOUS_FDI_CODE;
}

/**
 * Сменный прикус: постоянный зуб-преемник для молочного зуба.
 * Например: молочный 85 (нижний правый второй моляр) -> постоянный 45 (второй премоляр).
 * Квадранты FDI:
 * 51..55 -> 11..15 (-40)
 * 61..65 -> 21..25 (-40)
 * 71..75 -> 31..35 (-40)
 * 81..85 -> 41..45 (-40)
 */
export function getLocusSuccessorToothNumber(
	deciduousToothNumber: number,
): number | null {
	if (!isDeciduousFdiToothNumber(deciduousToothNumber)) return null;
	const quad = Math.floor(deciduousToothNumber / 10);
	const pos = deciduousToothNumber % 10;
	if (quad >= 5 && quad <= 8 && pos >= 1 && pos <= 5) {
		return (quad - 4) * 10 + pos;
	}
	return null;
}

/**
 * Сменный прикус: молочный зуб-предшественник для постоянного зуба.
 * Например: постоянный 45 -> молочный 85 (+40).
 * Постоянные моляры (16..18, 26..28, 36..38, 46..48) не имеют молочных предшественников.
 */
export function getLocusPredecessorToothNumber(
	adultToothNumber: number,
): number | null {
	if (
		!isValidFdiToothNumber(adultToothNumber) ||
		isDeciduousFdiToothNumber(adultToothNumber)
	) {
		return null;
	}
	const quad = Math.floor(adultToothNumber / 10);
	const pos = adultToothNumber % 10;
	if (quad >= 1 && quad <= 4 && pos >= 1 && pos <= 5) {
		return (quad + 4) * 10 + pos;
	}
	return null;
}

/** Связанные номера зубов локуса в сменном прикусе (молочный + постоянный). */
export function getRelatedLocusToothNumbers(toothNumber: number): number[] {
	if (isDeciduousFdiToothNumber(toothNumber)) {
		const succ = getLocusSuccessorToothNumber(toothNumber);
		return succ !== null ? [toothNumber, succ] : [toothNumber];
	}
	const pred = getLocusPredecessorToothNumber(toothNumber);
	return pred !== null ? [toothNumber, pred] : [toothNumber];
}

/** Человеческое описание перехода сменного прикуса по локусу. */
export function getLocusTransitionDescription(
	toothNumber: number,
): string | null {
	if (isDeciduousFdiToothNumber(toothNumber)) {
		const succ = getLocusSuccessorToothNumber(toothNumber);
		return succ !== null
			? `Сменный локус: молочный зуб #${toothNumber} ➔ постоянный преемник #${succ}`
			: null;
	}
	const pred = getLocusPredecessorToothNumber(toothNumber);
	return pred !== null
		? `Сменный локус: постоянный зуб #${toothNumber} (предшественник: молочный #${pred})`
		: null;
}

/**
 * Правила для состояния зуба.
 */
export function estimatorRulesForTooth(
	state: string,
	toothNumber: number,
): EstimatorRule[] {
	const rule = (
		key: EstimatorSuggestionKey,
		phase: number,
		match: PlanServiceRule | undefined,
	): EstimatorRule[] => (match ? [{ key, phase, match }] : []);

	switch (state) {
		case "Caries":
		case "Secondary_Caries":
		case "Filling_Caries":
			return rule("caries", 1, PLAN_SERVICE_RULES.Caries);
		case "Pulpitis":
			return rule("pulpitis", 1, PLAN_SERVICE_RULES.Pulpitis);
		case "Periodontitis":
		case "Apical_Periodontitis":
			return rule("periodontitis", 1, PLAN_SERVICE_RULES.Periodontitis);
		case "Periapical_Lesion":
		case "Granuloma":
		case "Cyst":
		case "Resection":
			return rule("resection", 2, EXTENDED_PATHOLOGY_RULES.resection);
		case "Root":
		case "Fracture":
		case "Extraction":
		case "Planned_Extraction":
			return rule("extraction", 2, EXTENDED_PATHOLOGY_RULES.extraction);
		case "Retained":
		case "Impacted":
		case "Dystopia":
			return rule("retained", 2, PLAN_SERVICE_RULES.Retained);
		case "Crown":
		case "Planned_Crown":
		case "Temporary_Crown":
		case "Defective_Crown":
			return rule("crown", 3, PLAN_SERVICE_RULES.Crown);
		case "Bridge":
		case "Bridge_Abutment":
			return rule("bridge", 3, EXTENDED_PATHOLOGY_RULES.bridge);
		case "Veneer":
			return rule("veneer", 3, EXTENDED_PATHOLOGY_RULES.veneer);
		case "Inlay":
		case "Onlay":
		case "Pin":
		case "Core_Inlay":
			return rule("inlay", 3, EXTENDED_PATHOLOGY_RULES.inlay);
		case "Partial_Denture":
		case "Complete_Denture":
		case "Clasp_Denture":
			return rule("denture", 3, EXTENDED_PATHOLOGY_RULES.denture);
		case "Defective_Restoration":
			return rule("caries", 1, PLAN_SERVICE_RULES.Caries);
		case "Calculus":
		case "Plaque":
			return rule("hygiene", 1, EXTENDED_PATHOLOGY_RULES.hygiene);
		case "Gingivitis":
		case "Bleeding":
		case "Pocket":
		case "Recession":
		case "Periodontitis_Mild":
		case "Periodontitis_Moderate":
		case "Periodontitis_Severe":
		case "Mobility":
		case "Mobility_I":
		case "Mobility_II":
		case "Mobility_III":
		case "Mobility_IV":
		case "Furcation_I":
		case "Furcation_II":
		case "Furcation_III":
			return rule("perio", 1, EXTENDED_PATHOLOGY_RULES.perio);
		case "Planned_Implant":
		case "Implant":
		case "Missing":
		case "Extracted":
			if (isDeciduousFdiToothNumber(toothNumber)) return [];
			return [
				...rule("implant", 2, PLAN_SERVICE_RULES.Planned_Implant),
				...rule("implantGuide", 2, SURGICAL_GUIDE_RULE),
			];
		default:
			return [];
	}
}
