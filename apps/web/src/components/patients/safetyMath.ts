/**
 * safetyMath.ts — Клинический двигатель безопасности пациента, аллергостатуса и критических стоп-факторов DENTE.
 * Мандаты 8e, 8k, 8n: Ноль фармакологической паранойи, автономия врача, физиологическая норма в 1 клик.
 */

import {
	type AnesthesiaDrugKey,
	type AutopilotResolutionResult,
	type PatientMrdCalculation,
	type SomaticRiskProfile,
	calculatePatientMrd,
	resolveAutopilotAnesthesia,
} from "../visit/anesthesiaCalculatorEngine";
import { CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT, isNegativeAllergyStatement } from "../../utils/somaticNorm";
export { isNegativeAllergyStatement };

export type ClinicalSafetySeverity = "critical" | "high" | "moderate" | "info" | "none";

export type ClinicalSafetyCategory =
	| "anesthesia_allergy"
	| "pacemaker_cardio"
	| "anticoagulants"
	| "bisphosphonates"
	| "pregnancy"
	| "chronic_somatic"
	| "general_allergy";

export type PregnancyTrimester = "none" | "trimester_1" | "trimester_2" | "trimester_3" | "lactation";

export interface ClinicalSafetyItemDefinition {
	readonly id: string;
	readonly category: ClinicalSafetyCategory;
	readonly severity: ClinicalSafetySeverity;
	readonly shortBadge: string;
	readonly titleRu: string;
	readonly fullDescription: string;
	readonly forbiddenProcedures: readonly string[];
	readonly mandatoryPrecautions: readonly string[];
	readonly recommendedAnesthesiaNotes?: string | undefined;
	readonly icd10Codes?: readonly string[] | undefined;
	readonly keywords: readonly string[];
}

export interface PatientClinicalSafetyProfile {
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasMepivacaineAllergy?: boolean | undefined;
	readonly hasEsterAnestheticsAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasSulfitesAllergy?: boolean | undefined;
	readonly hasAnestheticAllergy?: boolean | undefined;
	readonly hasIodineAllergy?: boolean | undefined;
	readonly hasAnaphylaxisHistory?: boolean | undefined;
	readonly hasPacemakerExs?: boolean | undefined;
	readonly hasCardiovascularDisease?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasSevereHypertensionStage3?: boolean | undefined;
	readonly hasIhd?: boolean | undefined;
	readonly hasArrhythmia?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasPheochromocytoma?: boolean | undefined;
	readonly takesAnticoagulants?: boolean | undefined;
	readonly hasAnticoagulantTherapy?: boolean | undefined;
	readonly anticoagulantName?: string | undefined;
	readonly lastInrValue?: number | undefined;
	readonly takesBisphosphonates?: boolean | undefined;
	readonly hasBisphosphonateTherapy?: boolean | undefined;
	readonly bisphosphonateName?: string | undefined;
	readonly pregnancyTrimester: PregnancyTrimester;
	readonly gestationalWeeks?: number | undefined;
	readonly hasDiabetesMellitus?: boolean | undefined;
	readonly diabetesType?: "1" | "2" | "unknown" | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly hasEpilepsy?: boolean | undefined;
	readonly hasHepatitis?: boolean | undefined;
	readonly hasHiv?: boolean | undefined;
	readonly hasThyroidDisease?: boolean | undefined;
	readonly hasThyrotoxicosis?: boolean | undefined;
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;
	readonly hasNsaidAllergy?: boolean | undefined;
	readonly customAllergyNotes?: string | undefined;
	readonly customAllergiesNotes?: string | undefined;
	readonly customChronicNotes?: string | undefined;
	readonly currentMedicationsList?: string | undefined;
	readonly lastUpdated?: string | undefined;
}

export const DEFAULT_SOMATIC_HEALTHY_NORM: PatientClinicalSafetyProfile = {
	hasLidocaineAllergy: false,
	hasArticaineAllergy: false,
	hasMepivacaineAllergy: false,
	hasSulfiteAllergy: false,
	hasSulfitesAllergy: false,
	hasAnestheticAllergy: false,
	hasIodineAllergy: false,
	hasAnaphylaxisHistory: false,
	hasPacemakerExs: false,
	hasCardiovascularDisease: false,
	hasHypertension: false,
	takesAnticoagulants: false,
	hasAnticoagulantTherapy: false,
	anticoagulantName: "",
	takesBisphosphonates: false,
	hasBisphosphonateTherapy: false,
	bisphosphonateName: "",
	pregnancyTrimester: "none",
	hasDiabetesMellitus: false,
	diabetesType: "unknown",
	hasBronchialAsthma: false,
	hasEpilepsy: false,
	hasHepatitis: false,
	hasHiv: false,
	hasThyroidDisease: false,
	hasPenicillinAllergy: false,
	hasLatexAllergy: false,
	hasNsaidAllergy: false,
	customAllergyNotes: "",
	customChronicNotes: CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT,
	currentMedicationsList: "",
};

export function createHealthySomaticNormProfile(): PatientClinicalSafetyProfile {
	return { ...DEFAULT_SOMATIC_HEALTHY_NORM };
}

export function isSomaticProfilePhysiologicalNorm(profile?: Partial<PatientClinicalSafetyProfile> | null): boolean {
	if (!profile) return true;
	return (
		!profile.hasLidocaineAllergy &&
		!profile.hasArticaineAllergy &&
		!profile.hasMepivacaineAllergy &&
		!profile.hasSulfiteAllergy &&
		!profile.hasSulfitesAllergy &&
		!profile.hasAnestheticAllergy &&
		!profile.hasIodineAllergy &&
		!profile.hasAnaphylaxisHistory &&
		!profile.hasPacemakerExs &&
		!profile.hasCardiovascularDisease &&
		!profile.hasHypertension &&
		!profile.takesAnticoagulants &&
		!profile.hasAnticoagulantTherapy &&
		!profile.takesBisphosphonates &&
		!profile.hasBisphosphonateTherapy &&
		(profile.pregnancyTrimester === "none" || !profile.pregnancyTrimester) &&
		!profile.hasDiabetesMellitus &&
		!profile.hasBronchialAsthma &&
		!profile.hasEpilepsy &&
		!profile.hasHepatitis &&
		!profile.hasHiv &&
		!profile.hasThyroidDisease &&
		!profile.hasPenicillinAllergy &&
		!profile.hasLatexAllergy &&
		!profile.hasNsaidAllergy
	);
}

export { CLINICAL_SAFETY_CATALOG } from "./clinicalSafetyCatalogData";
export {
	evaluatePatientSafetyFlags,
	checkProcedureSafety,
	formatSafetyProfileToDiaryText,
} from "./patientSafetyEvaluation";
export type {
	PatientSafetyEvaluationResult,
	ClinicalSafetyFlag,
} from "./patientSafetyEvaluation";

export function parseSafetyProfileFromText(text?: string | null | undefined): PatientClinicalSafetyProfile {
	const raw = (text ?? "").toLowerCase();
	if (!raw.trim() || isNegativeAllergyStatement(raw)) {
		return { ...DEFAULT_SOMATIC_HEALTHY_NORM, pregnancyTrimester: "none" };
	}

	let pregnancyTrimester: PregnancyTrimester = "none";
	if (raw.includes("беременн") || raw.includes("лактац") || raw.includes("триместр") || raw.includes("гв")) {
		if (raw.includes("1 триместр") || raw.includes("1-й триместр")) pregnancyTrimester = "trimester_1";
		else if (raw.includes("3 триместр") || raw.includes("3-й триместр")) pregnancyTrimester = "trimester_3";
		else if (raw.includes("лактац") || raw.includes("гв")) pregnancyTrimester = "lactation";
		else pregnancyTrimester = "trimester_2";
	}

	const hasSevereHypertension = raw.includes("аг 3") || raw.includes("гб 3") || raw.includes("3 стад") || raw.includes("криз") || raw.includes("180/") || raw.includes("190/");
	const hasHypertension = hasSevereHypertension || raw.includes("гипертон") || raw.includes("гипертенз") || raw.includes("давлен") || raw.includes(" гб") || raw.includes(" аг");
	const hasThyrotoxicosis = raw.includes("тиреотоксикоз") || raw.includes("гипертиреоз") || raw.includes("токсический зоб");
	const takesBetaBlockers = raw.includes("бета-блокатор") || raw.includes("бисопролол") || raw.includes("конкор") || raw.includes("анаприлин") || raw.includes("метопролол");
	const hasIhd = raw.includes("ибс") || raw.includes("стенокард") || raw.includes("инфаркт");
	const hasArrhythmia = raw.includes("аритми") || raw.includes("тахикарди");
	const hasCardio = hasHypertension || hasSevereHypertension || hasThyrotoxicosis || takesBetaBlockers || hasIhd || hasArrhythmia;

	return {
		hasArticaineAllergy: raw.includes("артикаин") || raw.includes("ультракаин") || raw.includes("септанест"),
		hasLidocaineAllergy: raw.includes("лидокаин") || raw.includes("ксилокаин"),
		hasMepivacaineAllergy: raw.includes("мепивакаин") || raw.includes("скандонест"),
		hasEsterAnestheticsAllergy: raw.includes("новокаин") || raw.includes("прокаин") || raw.includes("анестезин"),
		hasSulfiteAllergy: raw.includes("сульфит") || raw.includes("метабисульфит"),
		hasPacemakerExs: raw.includes("кардиостимулятор") || /(^|[^а-яёa-z0-9])экс([^а-яёa-z0-9]|$)/i.test(raw) || raw.includes("пейсмейкер"),
		takesBisphosphonates: raw.includes("бисфосфонат") || raw.includes("акласта") || raw.includes("зомета") || raw.includes("бонвива") || raw.includes("пролиа") || raw.includes("mronj") || raw.includes("бонч"),
		takesAnticoagulants: raw.includes("варфарин") || raw.includes("ксарелто") || raw.includes("эликвис") || raw.includes("прадакса") || raw.includes("плавикс") || raw.includes("тромбо асс") || raw.includes("антикоагулянт"),
		pregnancyTrimester,
		hasCardiovascularDisease: hasCardio,
		hasHypertension,
		hasSevereHypertensionStage3: hasSevereHypertension,
		hasThyrotoxicosis,
		takesBetaBlockers,
		hasIhd,
		hasArrhythmia,
		hasDiabetesMellitus: raw.includes("диабет") || raw.includes("инсулин"),
		hasBronchialAsthma: raw.includes("астма") || raw.includes("бронхиальн"),
		hasEpilepsy: raw.includes("эпилепс") || raw.includes("судорог"),
		hasHepatitis: raw.includes("гепатит"),
		hasHiv: raw.includes("вич") || raw.includes("спид"),
		hasPenicillinAllergy: raw.includes("пенициллин") || raw.includes("амоксициллин") || raw.includes("амоксиклав") || raw.includes("аугментин"),
		hasLatexAllergy: raw.includes("латекс"),
		hasNsaidAllergy: raw.includes("нпвп") || raw.includes("нпвс") || raw.includes("аспирин") || raw.includes("кеторол") || raw.includes("ибупрофен") || raw.includes("диклофенак") || raw.includes("аспириновая астма"),
		hasIodineAllergy: raw.includes("йод") || raw.includes("йодоформ") || raw.includes("бетадин"),
		customChronicNotes: text ? text : undefined,
	};
}

export function patientProfileToSomaticRiskProfile(
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
): SomaticRiskProfile {
	if (!profile) return {};
	if (typeof profile === "string") return patientProfileToSomaticRiskProfile(parseSafetyProfileFromText(profile));

	const hasCardio = Boolean(profile.hasCardiovascularDisease || profile.hasHypertension || profile.hasSevereHypertensionStage3 || profile.hasIhd || profile.hasArrhythmia || profile.hasPacemakerExs);
	const isPregnant = Boolean(profile.pregnancyTrimester && profile.pregnancyTrimester !== "none");

	return {
		hasCardiovascularRisk: hasCardio,
		hasHypertension: Boolean(profile.hasHypertension),
		hasSevereHypertensionStage3: Boolean(profile.hasSevereHypertensionStage3),
		hasIhd: Boolean(profile.hasIhd),
		hasArrhythmia: Boolean(profile.hasArrhythmia),
		hasThyrotoxicosis: Boolean(profile.hasThyrotoxicosis),
		takesBetaBlockers: Boolean(profile.takesBetaBlockers),
		hasArticaineAllergy: Boolean(profile.hasArticaineAllergy),
		hasMepivacaineAllergy: Boolean(profile.hasMepivacaineAllergy),
		hasLidocaineAllergy: Boolean(profile.hasLidocaineAllergy),
		hasSulfiteAllergy: Boolean(profile.hasSulfiteAllergy || profile.hasSulfitesAllergy),
		hasBronchialAsthma: Boolean(profile.hasBronchialAsthma),
		isPregnantOrLactating: isPregnant,
		pregnancyTrimester: profile.pregnancyTrimester,
		customNotes: profile.customChronicNotes || profile.customAllergyNotes,
	};
}

export function getAnesthesiaAutopilotForPatient(
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
	weightKg?: number | undefined,
	ageYears?: number | null | undefined,
	isPediatric?: boolean | undefined,
): AutopilotResolutionResult {
	const somatic = patientProfileToSomaticRiskProfile(profile);
	return resolveAutopilotAnesthesia({ somaticProfile: somatic, patientWeightKg: weightKg, patientAgeYears: ageYears, isPediatric });
}

export function calculatePatientMrdForProfile(params: {
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	drugKey: AnesthesiaDrugKey;
	patientWeightKg: number;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
}): PatientMrdCalculation {
	const somatic = patientProfileToSomaticRiskProfile(params.profile);
	const hasCardio = Boolean(somatic.hasCardiovascularRisk || somatic.hasHypertension || somatic.hasIhd || somatic.hasArrhythmia);
	return calculatePatientMrd({
		drugKey: params.drugKey,
		patientWeightKg: params.patientWeightKg,
		patientAgeYears: params.patientAgeYears,
		isPediatric: params.isPediatric,
		isCardioRestricted: hasCardio,
	});
}
