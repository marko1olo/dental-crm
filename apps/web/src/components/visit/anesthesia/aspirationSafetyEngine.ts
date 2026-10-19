/**
 * aspirationSafetyEngine.ts — Electronic Aspiration Test Protocol & Safety Engine
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import {
	type ConductionTechniqueId,
	getNeedleSpecification,
	getTechniqueSpecification,
	type NeedleGaugeId,
} from "./anesthesiaTechniqueMath";
import type { VascularRiskAssessment } from "./aspirationTypes";

export {
	calculateInjectionSpeedProfile,
	generateAspirationJournalEntry043,
} from "./aspirationJournal043";
export * from "./aspirationTypes";

export function evaluateVascularRisk(params: {
	techniqueId: ConductionTechniqueId;
	needleId: NeedleGaugeId;
	patientAgeYears?: number | undefined;
	hasAnatomicAnomaly?: boolean | undefined;
}): VascularRiskAssessment {
	const technique = getTechniqueSpecification(params.techniqueId);
	const needle = getNeedleSpecification(params.needleId);
	const warnings: string[] = [];
	let adjustedRisk = technique.baseVascularHitRiskPercent;
	const falseNegativeRisk = needle.gauge === "30G" ? 12.0 : 1.0;

	if (
		needle.gauge === "30G" &&
		technique.vascularRiskTier === "critical_high"
	) {
		warnings.push(
			"Узкий просвет 30G: риск ложноотрицательной аспирации. Рекомендуется 27G 35 мм.",
		);
	}
	if (params.patientAgeYears !== undefined && params.patientAgeYears < 12) {
		adjustedRisk += 3.0;
	}

	return {
		techniqueId: params.techniqueId,
		needleId: params.needleId,
		baseVascularHitRiskPercent: technique.baseVascularHitRiskPercent,
		adjustedVascularRiskPercent: adjustedRisk,
		falseNegativeAspirationRiskPercent: falseNegativeRisk,
		riskTier: technique.vascularRiskTier,
		isTwoPlaneAspirationMandatory: technique.aspirationPlanesRequired >= 2,
		needleGaugeAppropriate: !(
			needle.gauge === "30G" && technique.vascularRiskTier === "critical_high"
		),
		safetyWarningsRu: warnings,
		clinicalRecommendationsRu: technique.clinicalRecommendationsRu,
	};
}
