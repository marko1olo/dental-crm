import type { ClinicalSafetyCategory, ClinicalSafetySeverity } from "../safetyMath";

export interface PatientSafetyEvaluationResult {
	readonly hasCriticalStopFlags: boolean;
	readonly hasHighRiskFlags: boolean;
	readonly totalAlertCount: number;
	readonly maxSeverity: ClinicalSafetySeverity;
	readonly activeFlags: readonly ClinicalSafetyFlag[];
	readonly forbiddenProcedures: readonly string[];
	readonly mandatoryPrecautions: readonly string[];
	readonly anestheticRecommendations: readonly string[];
	readonly formattedSummaryLine: string;
	readonly formattedDiarySection: string;
}

export interface ClinicalSafetyFlag {
	readonly id: string;
	readonly category: ClinicalSafetyCategory;
	readonly severity: ClinicalSafetySeverity;
	readonly shortBadge: string;
	readonly titleRu: string;
	readonly description: string;
	readonly forbiddenProcedures: readonly string[];
	readonly mandatoryPrecautions: readonly string[];
	readonly recommendedAnesthesiaNotes?: string | undefined;
	readonly source: "structured_profile" | "text_parsing" | "manual";
}
