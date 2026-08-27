import type { AapGrade, AapStage, DiabetesStatus, PerioChartSummary, PerioToothRecord, SmokingStatus } from "./types.js";
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
/**
 * Evaluates Periodontitis Staging and Grading according to AAP/EFP 2018 World Workshop criteria.
 */
export declare function calculateAapEfpStagingAndGrading(teeth: readonly PerioToothRecord[], summary?: PerioChartSummary, options?: AapClassificationOptions): PeriodontalDiagnosisDetail;
/**
 * Backward compatibility alias for derivePeriodontalDiagnosis.
 */
export declare function derivePeriodontalDiagnosis(teeth: readonly PerioToothRecord[], summary?: PerioChartSummary, options?: AapClassificationOptions): PeriodontalDiagnosisDetail;
