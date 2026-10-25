/**
 * packages/shared/src/perio/mathCal.ts
 *
 * Clinical attachment level (CAL), bone loss ratios and probing colors.
 * Mandate 8b: File <= 120 lines.
 */

import { PERIO_SITE_KEYS, type PerioToothRecord } from "./types.js";

export function calculateClinicalAttachmentLevel(
	probingDepthMm: number,
	gingivalMarginMm: number,
): number {
	const pd = Number.isFinite(probingDepthMm) ? Math.max(0, Math.round(probingDepthMm)) : 0;
	const gm = Number.isFinite(gingivalMarginMm) ? Math.round(gingivalMarginMm) : 0;
	return Math.max(0, pd + gm);
}

export { calculateClinicalAttachmentLevel as calculateSepaCal };

export function isFurcationEligibleTooth(toothNumber: number): boolean {
	const pos = toothNumber % 10;
	const quad = Math.floor(toothNumber / 10);
	const isUpper = quad === 1 || quad === 2 || quad === 5 || quad === 6;

	if (isUpper && (pos === 6 || pos === 7 || pos === 8)) return true;
	if (isUpper && pos === 4) return true;
	if (!isUpper && (pos === 6 || pos === 7 || pos === 8)) return true;
	if (quad >= 5 && (pos === 4 || pos === 5)) return true;
	return false;
}

export { isFurcationEligibleTooth as isPerioMultiRootedTooth };

export function calculateBoneLossAgeRatio(
	boneLossPercent: number,
	patientAgeYears: number,
): number {
	const safeAge = Math.max(18, Math.min(120, patientAgeYears));
	const safeLoss = Math.max(0, Math.min(100, boneLossPercent));
	return Math.round((safeLoss / safeAge) * 100) / 100;
}

export function estimateBoneLossPercentFromTeeth(
	teeth: readonly PerioToothRecord[],
	maxCalMm?: number,
): number {
	if (typeof maxCalMm === "number" && maxCalMm >= 0) {
		return Math.min(95, Math.max(0, Math.round((maxCalMm / 12) * 100)));
	}

	let maxCal = 0;
	for (const tooth of teeth) {
		if (tooth.isMissing) continue;
		for (const sKey of PERIO_SITE_KEYS) {
			const s = tooth[sKey];
			if (!s) continue;
			const cal = calculateClinicalAttachmentLevel(s.probingDepthMm, s.gingivalMarginMm);
			if (cal > maxCal) maxCal = cal;
		}
	}
	return Math.min(95, Math.max(0, Math.round((maxCal / 12) * 100)));
}

export function getProbingDepthColor(depthMm: number): {
	readonly textColor: string;
	readonly bgColor: string;
	readonly borderColor: string;
	readonly labelRu: string;
	readonly isDeep: boolean;
} {
	if (depthMm <= 3) {
		return {
			textColor: "text-emerald-700 dark:text-emerald-300",
			bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
			borderColor: "border-emerald-200 dark:border-emerald-800",
			labelRu: "Норма (1-3 мм)", isDeep: false,
		};
	}
	if (depthMm <= 5) {
		return {
			textColor: "text-amber-700 dark:text-amber-300",
			bgColor: "bg-amber-50 dark:bg-amber-950/40",
			borderColor: "border-amber-200 dark:border-amber-800",
			labelRu: "Умеренный карман (4-5 мм)", isDeep: false,
		};
	}
	return {
		textColor: "text-rose-700 dark:text-rose-300",
		bgColor: "bg-rose-50 dark:bg-rose-950/50",
		borderColor: "border-rose-300 dark:border-rose-800",
		labelRu: "Глубокий карман (≥ 6 мм)", isDeep: true,
	};
}
