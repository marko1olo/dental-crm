/**
 * packages/shared/src/perio/extendedHygieneScores.ts
 *
 * Silness-Löe, Fedorov-Volodkina and Podshadley-Haley PHP scoring calculations.
 * Mandate 8b: File <= 120 lines.
 */

import { HYGIENE_INDEX_TEETH_CONFIG } from "./hygieneConfig.js";
import type {
	ExtendedToothAssessment,
	FedorovVolodkinaResult,
	PhpResult,
	SilnessLoeResult,
} from "./extendedHygieneTypes.js";

export function calculateSilnessLoeScore(
	assessments: Record<number, ExtendedToothAssessment> | readonly ExtendedToothAssessment[],
): SilnessLoeResult {
	const map = Array.isArray(assessments)
		? new Map(assessments.map((a) => [a.toothNumber, a]))
		: new Map(Object.entries(assessments).map(([k, v]) => [Number(k), v]));

	let total = 0;
	let count = 0;
	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = map.get(cfg.toothNumber);
		if (item) {
			const score = item.silnessScore ?? item.debrisScore ?? 0;
			total += Math.max(0, Math.min(3, score));
			count++;
		}
	}

	const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
	let evaluation: "excellent" | "good" | "moderate" | "poor" = "excellent";
	let ratingText = "Silness-Löe = 0.0 (Налет отсутствует / норма)";

	if (avg === 0) evaluation = "excellent";
	else if (avg <= 0.9) { evaluation = "good"; ratingText = `Silness-Löe = ${avg.toFixed(1)} (Хорошая гигиена / незначительный налет)`; }
	else if (avg <= 1.9) { evaluation = "moderate"; ratingText = `Silness-Löe = ${avg.toFixed(1)} (Удовлетворительная гигиена / умеренный налет)`; }
	else { evaluation = "poor"; ratingText = `Silness-Löe = ${avg.toFixed(1)} (Плохая гигиена / обильный налет)`; }

	return { score: avg, ratingText, evaluation, isOptimal: avg === 0 };
}

export function calculateFedorovVolodkinaScore(
	assessments: Record<number, ExtendedToothAssessment> | readonly ExtendedToothAssessment[],
): FedorovVolodkinaResult {
	const map = Array.isArray(assessments)
		? new Map(assessments.map((a) => [a.toothNumber, a]))
		: new Map(Object.entries(assessments).map(([k, v]) => [Number(k), v]));

	let total = 0;
	let count = 0;
	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = map.get(cfg.toothNumber);
		if (item) {
			const rawDebris = item.debrisScore ?? 0;
			const score = item.fedorovScore ?? (rawDebris === 0 ? 1 : Math.min(5, rawDebris + 1));
			total += Math.max(1, Math.min(5, score));
			count++;
		}
	}

	const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 1.0;
	let evaluation: "good" | "moderate" | "poor" | "bad" | "severe" = "good";
	let ratingText = "Федорова-Володкиной = 1.0 (Хорошая гигиена / норма)";

	if (avg <= 1.5) evaluation = "good";
	else if (avg <= 2.0) { evaluation = "moderate"; ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Удовлетворительная гигиена)`; }
	else if (avg <= 2.5) { evaluation = "poor"; ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Неудовлетворительная гигиена)`; }
	else if (avg <= 3.4) { evaluation = "bad"; ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Плохая гигиена)`; }
	else { evaluation = "severe"; ratingText = `Федорова-Володкиной = ${avg.toFixed(1)} (Очень плохая гигиена)`; }

	return { score: avg, ratingText, evaluation, isOptimal: avg <= 1.5 };
}

export function calculatePhpScore(
	assessments: Record<number, ExtendedToothAssessment> | readonly ExtendedToothAssessment[],
): PhpResult {
	const map = Array.isArray(assessments)
		? new Map(assessments.map((a) => [a.toothNumber, a]))
		: new Map(Object.entries(assessments).map(([k, v]) => [Number(k), v]));

	let total = 0;
	let count = 0;
	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const item = map.get(cfg.toothNumber);
		if (item) {
			const rawDebris = item.debrisScore ?? 0;
			const score = item.phpScore ?? Math.min(5, Math.round(rawDebris * 1.67));
			total += Math.max(0, Math.min(5, score));
			count++;
		}
	}

	const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0.0;
	let evaluation: "excellent" | "good" | "moderate" | "poor" = "excellent";
	let ratingText = "PHP = 0.0 (Отличная гигиена / норма)";

	if (avg === 0) evaluation = "excellent";
	else if (avg <= 0.6) { evaluation = "good"; ratingText = `PHP = ${avg.toFixed(1)} (Хорошая гигиена)`; }
	else if (avg <= 1.6) { evaluation = "moderate"; ratingText = `PHP = ${avg.toFixed(1)} (Удовлетворительная гигиена)`; }
	else { evaluation = "poor"; ratingText = `PHP = ${avg.toFixed(1)} (Неудовлетворительная гигиена)`; }

	return { score: avg, ratingText, evaluation, isOptimal: avg <= 0.6 };
}
