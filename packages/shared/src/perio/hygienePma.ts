/**
 * packages/shared/src/perio/hygienePma.ts
 *
 * Parma Papillary-Marginal-Alveolar (PMA) gingival inflammation index.
 * Mandate 8b: File <= 120 lines.
 */

import type { HygieneToothAssessment } from "./hygieneConfig.js";

export type PmaSeverityGrade = "intact" | "mild" | "moderate" | "severe";

export interface PmaResult {
	readonly pmaPercent: number;
	readonly totalPoints: number;
	readonly maxPossiblePoints: number;
	readonly assessedTeethCount: number;
	readonly severity: PmaSeverityGrade;
	readonly ratingText: string;
	readonly isHealthy: boolean;
}

export function calculatePmaScore(
	teethMap: Record<number, { pmaScore?: number | undefined; isMissing?: boolean | undefined }> | readonly HygieneToothAssessment[],
): PmaResult {
	let totalPoints = 0;
	let assessedTeethCount = 0;
	const teethEntries = Array.isArray(teethMap)
		? teethMap
		: Object.entries(teethMap).map(([num, val]) => ({ toothNumber: Number(num), ...val }));

	for (const entry of teethEntries) {
		if ((entry as any).isMissing) continue;
		if (typeof entry.pmaScore === "number" && Number.isFinite(entry.pmaScore)) {
			totalPoints += Math.max(0, Math.min(3, entry.pmaScore));
			assessedTeethCount++;
		}
	}

	if (assessedTeethCount === 0) {
		return {
			pmaPercent: 0, totalPoints: 0, maxPossiblePoints: 0,
			assessedTeethCount: 0, severity: "intact",
			ratingText: "PMA = 0% (Десна здорова, воспаление отсутствует)", isHealthy: true,
		};
	}

	const maxPossiblePoints = assessedTeethCount * 3;
	const pmaPercent = Math.round((totalPoints / maxPossiblePoints) * 1000) / 10;

	let severity: PmaSeverityGrade = "intact";
	let ratingText = `PMA = ${pmaPercent}% (Десна здорова)`;

	if (pmaPercent === 0) {
		severity = "intact";
		ratingText = `PMA = 0% (Десна здорова, воспаление отсутствует)`;
	} else if (pmaPercent <= 25) {
		severity = "mild";
		ratingText = `PMA = ${pmaPercent}% (Легкая степень гингивита / сосочки)`;
	} else if (pmaPercent <= 50) {
		severity = "moderate";
		ratingText = `PMA = ${pmaPercent}% (Средняя степень гингивита / край десны)`;
	} else {
		severity = "severe";
		ratingText = `PMA = ${pmaPercent}% (Тяжелая степень гингивита / альвеолярная десна)`;
	}

	return {
		pmaPercent, totalPoints, maxPossiblePoints, assessedTeethCount,
		severity, ratingText, isHealthy: pmaPercent === 0,
	};
}
