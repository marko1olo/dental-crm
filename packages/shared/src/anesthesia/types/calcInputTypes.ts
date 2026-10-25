/**
 * @dental/shared/anesthesia/types/calcInputTypes.ts
 * Clinical Input Types for Anesthesia Calculations (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaDrugKey, AnesthesiaMethodKey, AnestheticDrugId } from "./drugTypes.js";
import type { AnesthesiaCarpuleBatchInfo, AsaClassification, PreoperativeVitalsChecklist, SomaticRiskProfile } from "./safetyTypes.js";

export interface PatientAnesthesiaProfile {
	patientWeightKg: number;
	patientAgeYears?: number | undefined;
	isPediatric?: boolean | undefined;
	isGeriatric?: boolean | undefined;
	asaStatus?: AsaClassification | undefined;
	takesMaoInhibitors?: boolean | undefined;
	takesTricyclicAntidepressants?: boolean | undefined;
	hasThyrotoxicosis?: boolean | undefined;
	hasCardiacArrhythmia?: boolean | undefined;
	hasCardiovascularRisk?: boolean | undefined;
	hasHypertension?: boolean | undefined;
	bpSystolic?: number | undefined;
	bpDiastolic?: number | undefined;
	heartRateBpm?: number | undefined;
	spo2Percent?: number | undefined;
	preoperativeVitals?: PreoperativeVitalsChecklist | undefined;
	carpuleBatch?: AnesthesiaCarpuleBatchInfo | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	isPregnantOrLactating?: boolean | undefined;
	hasSevereLiverDisease?: boolean | undefined;
	hasGlaucoma?: boolean | undefined;
	hasPheochromocytoma?: boolean | undefined;
	hasAmideAllergy?: boolean | undefined;
}

export interface AnesthesiaCalculationInput extends PatientAnesthesiaProfile {
	drugId: AnestheticDrugId;
	drugKey?: AnestheticDrugId | undefined;
	carpulesCount: number;
	carpuleVolumeMl?: number | undefined;
	targetToothFdi?: string | number | undefined;
	aspirationConfirmed?: boolean | undefined;
	nurseFullName?: string | undefined;
}

export interface AnesthesiaSafetyParams {
	readonly drugKey: AnesthesiaDrugKey;
	readonly patientWeightKg?: number | undefined;
	readonly carpulesCount: number;
	readonly customVolumeMl?: number | undefined;
	readonly patientAgeYears?: number | null | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly carpuleBatch?: AnesthesiaCarpuleBatchInfo | undefined;
	readonly nurseFullName?: string | undefined;
}

export interface AnesthesiaSoapRecordParams {
	methodKey: AnesthesiaMethodKey;
	drugKey: AnesthesiaDrugKey;
	carpulesCount: number;
	customVolumeMl?: number | undefined;
	patientWeightKg?: number | undefined;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
	toothNumber?: number | string | undefined;
	aspirationTestPassed?: boolean | undefined;
	reactionNormal?: boolean | undefined;
	anesthesiaStartTime?: string | undefined;
	somaticProfile?: SomaticRiskProfile | undefined;
	carpuleBatch?: AnesthesiaCarpuleBatchInfo | undefined;
	nurseFullName?: string | undefined;
	vitals?: PreoperativeVitalsChecklist | undefined;
}

export type AnesthesiaDiaryRecordParams = AnesthesiaSoapRecordParams;
