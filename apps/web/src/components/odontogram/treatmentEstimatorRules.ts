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
	| "implant"
	| "implantGuide"
	| "crown";

/** Правило автоподбора: что искать в прайсе и на какой этап ставить. */
export interface EstimatorRule {
	readonly key: EstimatorSuggestionKey;
	/** I — терапия, II — хирургия, III — ортопедия. */
	readonly phase: number;
	/** Что искать в прайсе. Берётся из общего модуля, а не переписывается. */
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
			return rule("caries", 1, PLAN_SERVICE_RULES.Caries);
		case "Pulpitis":
			return rule("pulpitis", 1, PLAN_SERVICE_RULES.Pulpitis);
		case "Periodontitis":
			return rule("periodontitis", 1, PLAN_SERVICE_RULES.Periodontitis);
		case "Crown":
			return rule("crown", 3, PLAN_SERVICE_RULES.Crown);
		case "Planned_Implant":
		case "Implant":
			if (isDeciduousFdiToothNumber(toothNumber)) return [];
			return [
				...rule("implant", 2, PLAN_SERVICE_RULES.Planned_Implant),
				...rule("implantGuide", 2, SURGICAL_GUIDE_RULE),
			];
		default:
			return [];
	}
}
