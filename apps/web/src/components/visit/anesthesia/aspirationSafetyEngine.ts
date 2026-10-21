/**
 * aspirationSafetyEngine.ts — Electronic Aspiration Test Protocol & Safety Engine
 * Clean clinical safety rules without reality simulation or arbitrary percentages.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor), 8x/8ao, 8b (<= 120 lines).
 */
import {
	type ConductionTechniqueId,
	getNeedleSpecification,
	getTechniqueSpecification,
	type NeedleGaugeId,
} from "./anesthesiaTechniqueMath";
import type { VascularRiskAssessment } from "./aspirationTypes";

export {
	generateAspirationJournalEntry043,
	generateAspirationProtocolEntry,
} from "./aspirationJournalProtocol";
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

	if (
		needle.gauge === "30G" &&
		technique.vascularRiskTier === "critical_high"
	) {
		warnings.push(
			"Узкий просвет 30G: риск ложноотрицательной аспирации при проводниковой блокаде. Рекомендуется 27G 35 мм.",
		);
	}

	return {
		techniqueId: params.techniqueId,
		needleId: params.needleId,
		riskTier: technique.vascularRiskTier,
		isTwoPlaneAspirationMandatory: technique.aspirationPlanesRequired >= 2,
		needleGaugeAppropriate: !(
			needle.gauge === "30G" && technique.vascularRiskTier === "critical_high"
		),
		safetyWarningsRu: warnings,
		clinicalRecommendationsRu: technique.clinicalRecommendationsRu,
	};
}
