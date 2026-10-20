/**
 * anesthesiaCalculatorEngine.ts
 * Unified Maximum Recommended Dose (MRD) Engine, Clinical Safety Caliper,
 * Pediatric Weight Scaling & Somatic Cross-Check SSOT for Dental CRM.
 *
 * Consolidates:
 * 1. Weight-based MRD in mg and carpules (1.7 ml, 1.8 ml, 2.0 ml) for all primary dental anesthetics.
 * 2. Cardiac Epinephrine Gate (<= 0.04 mg limit for IHD, Hypertension, Arrhythmia, ASA III/IV).
 * 3. Pediatric dosage scaling: Clark's rule (weight-based), Young's rule (age-based), and direct mg/kg.
 * 4. Safety Speedometer & Zones (Green safe / Yellow caution / Orange warning / Red stop).
 * 5. Limiting Factor diagnosis (Weight, Absolute Cap, Cardiac Gate, Pediatric Scaling).
 * 6. Full re-exports and bridges to @dental/shared/anesthesia and anesthesiaMrdCalculatorEngine.
 *
 * Standards: Минздрав РФ, СтАР, AHA/ADA, Malamed's Handbook of Local Anesthesia.
 * Mandates: 8e (Doctor Autonomy), 8k (Friction-Killer), 8n (Solo Doctor Sovereignty), 8s (Anti-Duplication SSOT).
 */

import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_DRUG_CATALOG,
	ANESTHESIA_METHODS,
	ANESTHESIA_PKU_PRESETS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
	calculatePatientMrd as calculateCanonicalPatientMrd,
	calculateVisitAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	create1ClickAnesthesiaPkuDisposalRecord,
	createAnesthesiaPkuFromPreset,
	extractSomaticRiskProfileFromText,
	formatAnesthesiaSoapText,
	generateAnesthesiaPkuDisposalAct,
	resolveAutopilotAnesthesia,
	resolveClinicalDefaultWeightKg,
	validateCarpuleExpirationDate,
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
	ANESTHESIA_PKU_PRESETS,
	extractSomaticRiskProfileFromText,
	checkAnesthesiaSomaticContraindications,
	calculateCanonicalPatientMrd,
	calculateCanonicalPatientMrd as calculatePatientMrd,
	resolveAutopilotAnesthesia,
	formatAnesthesiaSoapText,
	resolveClinicalDefaultWeightKg,
	createAnesthesiaPkuFromPreset,
	create1ClickAnesthesiaPkuDisposalRecord,
	validateCarpuleExpirationDate,
	generateAnesthesiaPkuDisposalAct,
	calculateVisitAnesthesiaSafety,
};

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

export * from "./anesthesiaMrdCalculatorEngine.js";
