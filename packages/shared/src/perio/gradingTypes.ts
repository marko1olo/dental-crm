/**
 * packages/shared/src/perio/gradingTypes.ts
 *
 * Types for AAP/EFP 2018 staging, grading and clinical diagnosis.
 * Mandate 8b: File <= 120 lines.
 */

import type {
	AapGrade,
	AapStage,
	DiabetesStatus,
	SmokingStatus,
} from "./types.js";

export interface PeriodontalDiagnosisDetail {
	readonly icd10Code: string;
	readonly diagnosisNameRu: string;
	readonly stageDescriptionRu: string;
	readonly severity: "intact" | "gingivitis" | "mild" | "moderate" | "severe";
	readonly aapStage: AapStage;
	readonly aapGrade: AapGrade;
	readonly extent: "localized" | "generalized" | "molar_incisor";
	readonly extentLabelRu: string;
	readonly isGeneralized: boolean;
	readonly hasSuppuration: boolean;
}

export interface AapClassificationOptions {
	readonly patientAgeYears?: number | undefined;
	readonly radiographicBoneLossPercent?: number | undefined;
	readonly smokingStatus?: SmokingStatus | undefined;
	readonly diabetesStatus?: DiabetesStatus | undefined;
}
