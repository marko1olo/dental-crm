/**
 * @dental/shared/anesthesia/types.ts
 * Unified Pharmacological, Anesthetic & Somatic Safety Types
 */

// Comprehensive Drug Identifiers
export type AnestheticDrugId =
	| "articaine_4_epi_100k"
	| "articaine_4_epi_200k"
	| "mepivacaine_3_plain"
	| "lidocaine_2_epi_100k"
	| "lidocaine_2_plain"
	| "bupivacaine_05_epi_200k";

// Visit / Chairside Drug Keys
export type AnesthesiaDrugKey =
	| "ultracain_ds_forte"
	| "ultracain_ds"
	| "septanest_100"
	| "scandonest_3"
	| "lidocaine_2";

/** @deprecated Use AnestheticDrugId or AnesthesiaDrugKey instead */
export type LegacyAnestheticDrugKey = AnestheticDrugId;

export type VasoconstrictorRatio = "1:100000" | "1:200000" | "1:50000" | "none";

export type AnesthesiaSafetyZone = "safe" | "caution" | "warning" | "overdose_danger";
export type AnesthesiaSafetyLevel = "safe" | "caution" | "warning" | "danger";
export type SomaticAlertSeverity = "danger" | "warning" | "caution" | "info" | "safe";

export type AsaClassification = "asa_1" | "asa_2" | "asa_3" | "asa_4";
export type AsaPhysicalStatus = AsaClassification;

export type AnesthesiaMethodKey =
	| "infiltration"
	| "mandibular"
	| "torusal"
	| "tuberal"
	| "incisive"
	| "intraligamentary"
	| "application";

export type NeedleGaugeType =
	| "g27_long_35mm"
	| "g30_short_21mm"
	| "g30_ultrashort_12mm"
	| "g30_extrashort_8mm";

export interface AnesthesiaDrugSpec {
	readonly id: AnestheticDrugId;
	readonly nameRu: string;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly activeConcentrationPercent: number;
	readonly mgPerMlActive: number;
	readonly vasoconstrictorNameRu: string;
	readonly vasoconstrictorRatio: VasoconstrictorRatio;
	readonly epinephrineMgPerMl: number;
	readonly standardCarpuleVolumeMl: number;
	readonly mgActivePerCarpule: number;
	readonly mgEpiPerCarpule: number;
	readonly maxDoseMgPerKgAdult: number;
	readonly maxDoseMgPerKgPediatric: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly containsSulfites: boolean;
	readonly isAdrenalineFree: boolean;
	readonly durationPulpalMinutes: number;
	readonly durationSoftTissueMinutes: number;
	readonly onsetMinutes: number;
	readonly clinicalIndicationsRu: string;
	readonly contraindicationsRu: readonly string[];
}

export interface AnesthesiaDrugDefinition {
	readonly key: AnesthesiaDrugKey;
	readonly commercialName: string;
	readonly activeSubstance: string;
	readonly concentrationPct: number;
	readonly vasoconstrictor: string;
	readonly vasoconstrictorRatio: "1:100000" | "1:200000" | "none";
	readonly epinephrineMgPerCarpule: number;
	readonly containsSulfites: boolean;
	readonly volumeMlPerCarpule: number;
	readonly mgPerCarpule: number;
	readonly maxDoseMgPerKg: number;
	readonly maxDoseMgPerKgPediatric?: number;
	readonly absoluteMaxDoseMg: number;
	readonly isAdrenalineFree: boolean;
	readonly description: string;
}

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
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	isPregnantOrLactating?: boolean | undefined;
	hasSevereLiverDisease?: boolean | undefined;
	hasGlaucoma?: boolean | undefined;
	hasPheochromocytoma?: boolean | undefined;
	hasAmideAllergy?: boolean | undefined;
}

export interface SomaticRiskProfile {
	readonly hasCardiovascularRisk?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasSevereHypertensionStage3?: boolean | undefined;
	readonly hasIhd?: boolean | undefined;
	readonly hasArrhythmia?: boolean | undefined;
	readonly hasThyrotoxicosis?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasMepivacaineAllergy?: boolean | undefined;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isPregnantOrLactating?: boolean | undefined;
	readonly pregnancyTrimester?: "none" | "trimester_1" | "trimester_2" | "trimester_3" | "lactation" | undefined;
	readonly customNotes?: string | undefined;
}

export interface AnesthesiaSomaticAlert {
	readonly id: string;
	readonly severity: SomaticAlertSeverity;
	readonly title: string;
	readonly message: string;
	readonly recommendedDrugKey?: AnesthesiaDrugKey | undefined;
	readonly recommendedAction?: string | undefined;
}

export interface SomaticCrossCheckResult {
	readonly hasContraindications: boolean;
	readonly alerts: readonly AnesthesiaSomaticAlert[];
	readonly recommendedDrugKey: AnesthesiaDrugKey | null;
	readonly maxCardioCarpules: number | null;
	readonly totalEpinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly isCardioRestricted: boolean;
	readonly cardioLimitBadgeText: string | null;
	readonly cardioLimitDetails: {
		readonly maxEpinephrineMg: number;
		readonly maxCarpules: number | null;
		readonly currentEpinephrineMg: number;
		readonly isExceeded: boolean;
	} | null;
}

export interface AnesthesiaCalculationInput extends PatientAnesthesiaProfile {
	drugId: AnestheticDrugId;
	drugKey?: AnestheticDrugId | undefined;
	carpulesCount: number;
	carpuleVolumeMl?: number | undefined;
	targetToothFdi?: string | number | undefined;
	aspirationConfirmed?: boolean | undefined;
}

export interface ComprehensiveAnesthesiaCalculationResult {
	readonly drug: AnesthesiaDrugSpec;
	readonly carpulesCount: number;
	readonly carpuleVolumeMl: number;
	readonly injectedVolumeMl: number;
	readonly injectedActiveMg: number;
	readonly injectedEpinephrineMg: number;

	readonly maxSafeActiveMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly maxSafeCarpulesCount: number;
	readonly maxSafeVolumeMl: number;

	readonly remainingSafeActiveMg: number;
	readonly remainingSafeEpinephrineMg: number;
	readonly remainingSafeCarpulesCount: number;

	readonly percentOfMaxDose: number;
	readonly percentOfEpiMaxDose: number;
	readonly peakUtilizationPercent: number;

	readonly effectiveMaxMgPerKg: number;
	readonly isPediatric: boolean;
	readonly isGeriatric: boolean;
	readonly ageReductionFactor: number;

	readonly safetyZone: AnesthesiaSafetyZone;
	readonly isOverdose: boolean;
	readonly isEpinephrineOverdose: boolean;
	readonly isBlocked: boolean;

	readonly limitingFactor: string;
	readonly blockingContraindications: readonly string[];
	readonly warnings: readonly string[];
	readonly recommendedAlternativeId?: AnestheticDrugId | undefined;
	readonly recommendedAlternativeKey?: AnestheticDrugId | undefined;
	readonly clinicalAdviceRu: string;
	readonly soapDiaryText: string;
}

export interface AnesthesiaSafetyParams {
	readonly drugKey: AnesthesiaDrugKey;
	readonly patientWeightKg: number;
	readonly carpulesCount: number;
	readonly customVolumeMl?: number | undefined;
	readonly patientAgeYears?: number | null | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
}

export interface VisitAnesthesiaCalculationResult {
	readonly drug: AnesthesiaDrugDefinition;
	readonly patientWeightKg: number;
	readonly isPediatric: boolean;
	readonly effectiveMaxMgPerKg: number;
	readonly carpulesCount: number;
	readonly totalVolumeMl: number;
	readonly totalDoseMg: number;
	readonly maxSafeDoseMg: number;
	readonly maxSafeVolumeMl: number;
	readonly maxSafeCarpules: number;
	readonly mrdDoseMg: number;
	readonly mrdVolumeMl: number;
	readonly mrdCarpules: number;
	readonly totalEpinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly safetyRatio: number;
	readonly safetyLevel: AnesthesiaSafetyLevel;
	readonly safetyPercentage: number;
	readonly warningMessage: string | null;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly somaticAlerts: readonly AnesthesiaSomaticAlert[];
	readonly recommendedDrugKey: AnesthesiaDrugKey | null;
	readonly isCardioRestricted: boolean;
	readonly cardioLimitBadgeText: string | null;
	readonly cardioLimitDetails: {
		readonly maxEpinephrineMg: number;
		readonly maxCarpules: number | null;
		readonly currentEpinephrineMg: number;
		readonly isExceeded: boolean;
	} | null;
}

export interface PatientMrdCalculation {
	readonly drugKey: AnesthesiaDrugKey;
	readonly commercialName: string;
	readonly activeSubstance: string;
	readonly patientWeightKg: number;
	readonly isPediatric: boolean;
	readonly maxDoseMgPerKg: number;
	readonly mrdDoseMg: number;
	readonly mrdVolumeMl: number;
	readonly mrdCarpules: number;
	readonly isCappedByAbsoluteMax: boolean;
	readonly isCappedByCardio: boolean;
	readonly maxSafeEpinephrineMg: number;
	readonly cardioLimitBadgeText: string | null;
	readonly formattedNoteRu: string;
}

export interface AutopilotResolutionResult {
	readonly selectedDrugKey: AnesthesiaDrugKey;
	readonly drug: AnesthesiaDrugDefinition;
	readonly rationaleRu: string;
	readonly badgeText: string;
	readonly isCardioRestricted: boolean;
	readonly cardioLimitBadgeText: string | null;
	readonly mrdDoseMg: number;
	readonly mrdVolumeMl: number;
	readonly mrdCarpules: number;
	readonly maxSafeVolumeMl: number;
	readonly maxSafeEpinephrineMg: number;
	readonly crossCheck: SomaticCrossCheckResult;
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
}
