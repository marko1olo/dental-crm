/**
 * anesthesiaCalculatorEngine.ts
 * Clean EBM Local Anesthesia Contract for Dental CRM.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty), 8y (Zero Pharma Paranoia).
 */

import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_DRUG_CATALOG,
	ANESTHESIA_METHODS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
	calculatePatientMrd as calculateCanonicalPatientMrd,
	calculateVisitAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	extractSomaticRiskProfileFromText,
	formatAnesthesiaSoapText,
	resolveAutopilotAnesthesia,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaDrugDefinition,
	type AnesthesiaDrugKey,
	type AnesthesiaMethodKey,
	type AnesthesiaSafetyLevel,
	type AnesthesiaSafetyParams,
	type AnesthesiaSoapRecordParams,
	type AnesthesiaSomaticAlert,
	type AutopilotResolutionResult,
	type PatientMrdCalculation,
	type SomaticAlertSeverity,
	type SomaticCrossCheckResult,
	type SomaticRiskProfile,
	type VisitAnesthesiaCalculationResult,
} from "@dental/shared";

export type {
	AnesthesiaDrugKey,
	AnesthesiaMethodKey,
	AnesthesiaDrugDefinition,
	AnesthesiaSafetyLevel,
	SomaticAlertSeverity,
	SomaticRiskProfile,
	AnesthesiaSomaticAlert,
	SomaticCrossCheckResult,
	AnesthesiaSafetyParams,
	PatientMrdCalculation,
	AutopilotResolutionResult,
	AnesthesiaSoapRecordParams,
};

export type AnesthesiaCalculationResult = VisitAnesthesiaCalculationResult;

export {
	HEALTHY_MAX_EPINEPHRINE_MG,
	CARDIO_MAX_EPINEPHRINE_MG,
	CARDIO_LIMIT_BADGE_TEXT,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	ANESTHESIA_DRUG_CATALOG,
	extractSomaticRiskProfileFromText,
	checkAnesthesiaSomaticContraindications,
	calculateCanonicalPatientMrd,
	calculateCanonicalPatientMrd as calculatePatientMrd,
	resolveAutopilotAnesthesia,
	formatAnesthesiaSoapText,
	resolveClinicalDefaultWeightKg,
	calculateVisitAnesthesiaSafety,
};

/**
 * 1-Click Physiological Norm preset (Mandate 8e / 8y)
 * Standard infiltration/conduction for healthy adult: 1 carpule (1.7 ml) Ultracain D-S
 */
export function get1ClickPhysiologicalNorm(drugKey: AnesthesiaDrugKey = "ultracain_ds") {
	const drug = ANESTHESIA_DRUGS[drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	return {
		drugKey,
		carpulesCount: 1,
		volumeMl: drug.volumeMlPerCarpule,
		activeSubstanceMg: drug.mgPerCarpule,
		adrenalineMg: drug.epinephrineMgPerCarpule,
		isSafeNorm: true,
	};
}

/**
 * Passive Non-Blocking Allergy & Somatic warning string (Mandate 8y)
 */
export function getPassiveAllergyNotice(
	drugKey: AnesthesiaDrugKey,
	somaticProfile?: SomaticRiskProfile,
): string | null {
	if (!somaticProfile) return null;
	const check = checkAnesthesiaSomaticContraindications({ drugKey, somaticProfile });
	if (check.alerts.length === 0) return null;
	return `⚠️ ${check.alerts.map((a) => a.message).join("; ")}`;
}

export function calculateAnesthesiaSafety(
	params: AnesthesiaSafetyParams,
): VisitAnesthesiaCalculationResult {
	const effectiveWeight = resolveClinicalDefaultWeightKg(
		params.patientWeightKg,
		params.patientAgeYears,
		params.isPediatric,
	);
	return calculateVisitAnesthesiaSafety({
		...params,
		patientWeightKg: effectiveWeight,
	});
}

export * from "../anesthesia/anesthesiaCatalog.js";
export * from "../anesthesia/anesthesiaEngine.js";
