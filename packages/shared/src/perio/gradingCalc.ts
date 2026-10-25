/**
 * packages/shared/src/perio/gradingCalc.ts
 *
 * Core engine for AAP/EFP 2018 staging, grading and loss metrics.
 * Mandate 8b: File <= 120 lines.
 */

import {
	calculateBoneLossAgeRatio,
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	estimateBoneLossPercentFromTeeth,
} from "./math.js";
import type {
	AapGrade,
	DiabetesStatus,
	PerioChartSummary,
	PerioToothRecord,
	SmokingStatus,
} from "./types.js";
import type { AapClassificationOptions, PeriodontalDiagnosisDetail } from "./gradingTypes.js";
import { resolvePeriodontalStageDiagnosis } from "./gradingStages.js";

export function calculateAapEfpStagingAndGrading(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
	options?: AapClassificationOptions,
): PeriodontalDiagnosisDetail {
	const currentSummary = summary ?? calculatePerioIndices(teeth as PerioToothRecord[]);
	const activeTeeth = teeth.filter((t) => !t.isMissing);
	const examinedTeethCount = activeTeeth.length;
	const missingTeethCount = teeth.filter((t) => t.isMissing).length;

	const age = options?.patientAgeYears ?? 45;
	const boneLoss = options?.radiographicBoneLossPercent ?? estimateBoneLossPercentFromTeeth(teeth, currentSummary.maxCalMm);
	const blAgeRatio = calculateBoneLossAgeRatio(boneLoss, age);

	const smoking: SmokingStatus = options?.smokingStatus ?? "non_smoker";
	const diabetes: DiabetesStatus = options?.diabetesStatus ?? "none";

	let teethWithAttachmentLoss = 0;
	let teethWithSevereLoss = 0;

	for (const tooth of activeTeeth) {
		let maxToothCal = 0;
		let maxToothPd = 0;
		let hasLoss = false;

		const sites = [
			tooth.distoBuccal, tooth.midBuccal, tooth.mesioBuccal,
			tooth.distoLingual, tooth.midLingual, tooth.mesioLingual,
		];

		for (const s of sites) {
			const cal = calculateClinicalAttachmentLevel(s.probingDepthMm, s.gingivalMarginMm);
			if (cal > maxToothCal) maxToothCal = cal;
			if (s.probingDepthMm > maxToothPd) maxToothPd = s.probingDepthMm;
			if (s.probingDepthMm >= 4 || s.gingivalMarginMm > 0) hasLoss = true;
		}

		if (hasLoss || (tooth.furcation && tooth.furcation > 0) || (tooth.mobility && tooth.mobility > 0)) {
			teethWithAttachmentLoss++;
		}
		if (maxToothCal >= 5 || maxToothPd >= 7 || (tooth.furcation && tooth.furcation >= 2)) {
			teethWithSevereLoss++;
		}
	}

	const isGeneralized = examinedTeethCount > 0 ? (teethWithAttachmentLoss / examinedTeethCount) >= 0.3 : false;
	const extent: "localized" | "generalized" = isGeneralized ? "generalized" : "localized";
	const extentLabelRu = isGeneralized ? "генерализованный" : "локализованный";
	const hasSuppuration = currentSummary.sitesWithSuppurationCount > 0;

	let baseGrade: AapGrade = "grade_a";
	if (blAgeRatio > 1.0) baseGrade = "grade_c";
	else if (blAgeRatio >= 0.5) baseGrade = "grade_b";

	let finalGrade: AapGrade = baseGrade;
	if (smoking === "heavy" || diabetes === "uncontrolled") finalGrade = "grade_c";
	else if ((smoking === "light" || diabetes === "controlled") && finalGrade === "grade_a") finalGrade = "grade_b";

	return resolvePeriodontalStageDiagnosis({
		currentSummary, teethWithAttachmentLoss, teethWithSevereLoss,
		missingTeethCount, finalGrade, blAgeRatio, extent, extentLabelRu,
		isGeneralized, hasSuppuration,
	});
}

export function derivePeriodontalDiagnosis(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
	options?: AapClassificationOptions,
): PeriodontalDiagnosisDetail {
	return calculateAapEfpStagingAndGrading(teeth, summary, options);
}
