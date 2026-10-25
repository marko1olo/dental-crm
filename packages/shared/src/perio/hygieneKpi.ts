/**
 * packages/shared/src/perio/hygieneKpi.ts
 *
 * Leus Complex Periodontal Index (КПИ Леуса).
 * Mandate 8b: File <= 120 lines.
 */

import type { HygieneToothAssessment } from "./hygieneConfig.js";

export type KpiSeverityGrade = "healthy" | "risk" | "mild" | "moderate" | "severe";

export interface KpiResult {
	readonly kpiScore: number;
	readonly totalPoints: number;
	readonly assessedTeethCount: number;
	readonly severity: KpiSeverityGrade;
	readonly ratingText: string;
	readonly isHealthy: boolean;
}

export function calculateKpiScore(
	teethMap: Record<number, { kpiScore?: number | undefined; isMissing?: boolean | undefined }> | readonly HygieneToothAssessment[],
): KpiResult {
	let totalPoints = 0;
	let assessedTeethCount = 0;
	const teethEntries = Array.isArray(teethMap)
		? teethMap
		: Object.entries(teethMap).map(([num, val]) => ({ toothNumber: Number(num), ...val }));

	for (const entry of teethEntries) {
		if ((entry as any).isMissing) continue;
		if (typeof entry.kpiScore === "number" && Number.isFinite(entry.kpiScore)) {
			totalPoints += Math.max(0, Math.min(4, entry.kpiScore));
			assessedTeethCount++;
		}
	}

	if (assessedTeethCount === 0) {
		return {
			kpiScore: 0, totalPoints: 0, assessedTeethCount: 0,
			severity: "healthy", ratingText: "КПИ = 0.0 (Здоровый периодонт)", isHealthy: true,
		};
	}

	const kpiScore = Math.round((totalPoints / assessedTeethCount) * 10) / 10;
	let severity: KpiSeverityGrade = "healthy";
	let ratingText = `КПИ = ${kpiScore.toFixed(1)} (Здоровый периодонт)`;

	if (kpiScore === 0) {
		severity = "healthy";
		ratingText = `КПИ = 0.0 (Здоровый периодонт / интактен)`;
	} else if (kpiScore <= 1.0) {
		severity = "risk";
		ratingText = `КПИ = ${kpiScore.toFixed(1)} (Риск заболевания пародонта)`;
	} else if (kpiScore <= 2.0) {
		severity = "mild";
		ratingText = `КПИ = ${kpiScore.toFixed(1)} (Легкая степень поражения)`;
	} else if (kpiScore <= 3.5) {
		severity = "moderate";
		ratingText = `КПИ = ${kpiScore.toFixed(1)} (Средняя степень тяжести пародонтита)`;
	} else {
		severity = "severe";
		ratingText = `КПИ = ${kpiScore.toFixed(1)} (Тяжелая степень поражения пародонта)`;
	}

	return {
		kpiScore, totalPoints, assessedTeethCount, severity, ratingText, isHealthy: kpiScore === 0,
	};
}
