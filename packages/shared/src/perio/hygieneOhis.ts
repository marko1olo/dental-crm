/**
 * packages/shared/src/perio/hygieneOhis.ts
 *
 * Green-Vermillion Simplified Oral Hygiene Index (OHI-S).
 * Mandate 8b: File <= 120 lines.
 */

import type { HygieneToothAssessment } from "./hygieneConfig.js";

export type OhiSGrade = "excellent" | "good" | "moderate" | "poor" | "severe";

export interface OhiSResult {
	readonly debrisScore: number;
	readonly calculusScore: number;
	readonly totalScore: number;
	readonly ratingText: string;
	readonly clinicalEvaluation: OhiSGrade;
	readonly assessedTeethCount: number;
	readonly isOptimal: boolean;
}

export function calculateOhiSScore(
	teethMap: Record<number, { debrisScore?: number | undefined; calculusScore?: number | undefined; isMissing?: boolean | undefined }> | readonly HygieneToothAssessment[],
): OhiSResult {
	let totalDebris = 0;
	let totalCalculus = 0;
	let debrisCount = 0;
	let calculusCount = 0;
	const teethEntries = Array.isArray(teethMap)
		? teethMap
		: Object.entries(teethMap).map(([num, val]) => ({ toothNumber: Number(num), ...val }));

	for (const entry of teethEntries) {
		if ((entry as any).isMissing) continue;
		if (typeof entry.debrisScore === "number" && Number.isFinite(entry.debrisScore)) {
			totalDebris += Math.max(0, Math.min(3, entry.debrisScore));
			debrisCount++;
		}
		if (typeof entry.calculusScore === "number" && Number.isFinite(entry.calculusScore)) {
			totalCalculus += Math.max(0, Math.min(3, entry.calculusScore));
			calculusCount++;
		}
	}

	const assessedTeethCount = Math.max(debrisCount, calculusCount);
	if (assessedTeethCount === 0) {
		return {
			debrisScore: 0, calculusScore: 0, totalScore: 0,
			ratingText: "OHI-S = 0 (Норма / осмотр не проводился)",
			clinicalEvaluation: "excellent", assessedTeethCount: 0, isOptimal: true,
		};
	}

	const avgDebris = debrisCount > 0 ? Math.round((totalDebris / debrisCount) * 10) / 10 : 0;
	const avgCalculus = calculusCount > 0 ? Math.round((totalCalculus / calculusCount) * 10) / 10 : 0;
	const total = Math.round((avgDebris + avgCalculus) * 10) / 10;

	let clinicalEvaluation: OhiSGrade = "excellent";
	let ratingText = `OHI-S = ${total.toFixed(1)} (Отличная гигиена)`;

	if (total <= 0.6) {
		clinicalEvaluation = "excellent";
		ratingText = `OHI-S = ${total.toFixed(1)} (Низкий уровень налета / отличная гигиена)`;
	} else if (total <= 1.6) {
		clinicalEvaluation = "good";
		ratingText = `OHI-S = ${total.toFixed(1)} (Хороший уровень гигиены)`;
	} else if (total <= 2.5) {
		clinicalEvaluation = "moderate";
		ratingText = `OHI-S = ${total.toFixed(1)} (Удовлетворительный уровень гигиены)`;
	} else if (total <= 3.0) {
		clinicalEvaluation = "poor";
		ratingText = `OHI-S = ${total.toFixed(1)} (Неудовлетворительный уровень гигиены)`;
	} else {
		clinicalEvaluation = "severe";
		ratingText = `OHI-S = ${total.toFixed(1)} (Плохой уровень гигиены / массивные отложения)`;
	}

	return {
		debrisScore: avgDebris, calculusScore: avgCalculus, totalScore: total,
		ratingText, clinicalEvaluation, assessedTeethCount, isOptimal: total <= 0.6,
	};
}
