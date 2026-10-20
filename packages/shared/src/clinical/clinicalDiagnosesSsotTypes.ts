/**
 * packages/shared/src/clinical/clinicalDiagnosesSsotTypes.ts
 *
 * DENTE Dental CRM — Clinical Diagnoses & Protocols SSOT Types.
 * Strict Mandate 8b & Engineering Invariant: <= 500 lines.
 */

export type ClinicalDiagnosisCategory =
	| "caries"
	| "pulpitis"
	| "periodontitis"
	| "periodontal_disease"
	| "mucosa_stomatitis"
	| "non_carious"
	| "edentulism";

export interface ClinicalRecommendedService804n {
	readonly id: string;
	readonly code804n: string;
	readonly title: string;
	readonly defaultPriceRub: number;
	readonly defaultPriceKopecks: number;
	readonly category: string;
	readonly requiredByDefault: boolean;
}

export interface ClinicalDiagnosisSoapTemplate {
	readonly complaints: string;
	readonly anamnesis: string;
	readonly objective: string;
	readonly diagnosisText: string;
	readonly treatmentPlan: string;
	readonly recommendations: string;
}

export type ClinicalToothStateKind =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Healthy"
	| "Missing"
	| "Watch"
	| "Crown";

export type ClinicalDiagnosisSsotEntry = CanonicalClinicalDiagnosis;

export interface CanonicalClinicalDiagnosis {
	readonly id: string;
	readonly icd10: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly category: ClinicalDiagnosisCategory;
	readonly toothState: ClinicalToothStateKind;
	readonly clinicalNotes: string;
	readonly recommendedServices: readonly ClinicalRecommendedService804n[];
	readonly soapTemplate: ClinicalDiagnosisSoapTemplate;
}

export interface DiagnosisOptionItem {
	readonly value: string;
	readonly label: string;
	readonly code: string;
	readonly title: string;
	readonly category: ClinicalDiagnosisCategory;
}
