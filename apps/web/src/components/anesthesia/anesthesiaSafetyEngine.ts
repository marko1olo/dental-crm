/**
 * anesthesiaSafetyEngine.ts — Clinical Anesthesia Safety & Maximum Recommended Dose (MRD) Engine
 * Re-exported from canonical @dental/shared/anesthesia module.
 */

import {
	ANESTHESIA_DRUG_CATALOG,
	EPINEPHRINE_CEILINGS_MG,
	calculateComprehensiveAnesthesiaSafety,
	calculateEffectiveMgPerKg,
	isGeriatricPatient,
	isPediatricPatient,
	screenPatientContraindications,
	type AnesthesiaCalculationInput,
	type AnesthesiaDrugSpec,
	type AnesthesiaSafetyZone,
	type AnestheticDrugId,
	type ComprehensiveAnesthesiaCalculationResult,
	type PatientAnesthesiaProfile,
} from "@dental/shared";

export type {
	AnestheticDrugId,
	AnesthesiaDrugSpec,
	AnesthesiaSafetyZone,
	PatientAnesthesiaProfile,
	AnesthesiaCalculationInput,
};

export type AnestheticDrugKey = AnestheticDrugId;
export type VasoconstrictorRatio = "1:100000" | "1:200000" | "none";
export type AsaClassification = "asa_1" | "asa_2" | "asa_3" | "asa_4";
export type AnesthesiaCalculationResult = ComprehensiveAnesthesiaCalculationResult;

export {
	ANESTHESIA_DRUG_CATALOG,
	EPINEPHRINE_CEILINGS_MG,
	isPediatricPatient,
	isGeriatricPatient,
	calculateEffectiveMgPerKg,
	screenPatientContraindications,
};

export function calculateAnesthesiaSafety(
	input: AnesthesiaCalculationInput,
): ComprehensiveAnesthesiaCalculationResult {
	return calculateComprehensiveAnesthesiaSafety(input);
}
