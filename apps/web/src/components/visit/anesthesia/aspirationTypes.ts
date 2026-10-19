/**
 * aspirationTypes.ts — Electronic Aspiration Test Protocol Types
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import type {
	AnestheticDrugKey,
	ConductionTechniqueId,
	NeedleGaugeId,
	VascularRiskTier,
} from "./anesthesiaTechniqueMath";

export type AspirationTestStatus =
	| "not_performed"
	| "negative_safe"
	| "positive_trace"
	| "positive_burst"
	| "repositioned_and_retested";

export type AspirationActionTaken =
	| "proceed_slow_injection"
	| "immediate_stop_needle_repositioned"
	| "carpule_and_needle_replaced"
	| "technique_aborted_systemic_caution";

export interface AspirationAttemptRecord {
	readonly attemptNumber: number;
	readonly timestampIso: string;
	readonly plane1Result: "negative" | "positive_trace" | "positive_burst";
	readonly plane2Result?:
		| "negative"
		| "positive_trace"
		| "positive_burst"
		| undefined;
	readonly overallResult: "negative" | "positive";
	readonly bloodObserved: boolean;
	readonly needleId: NeedleGaugeId;
	readonly actionTaken: AspirationActionTaken;
	readonly notesRu?: string | undefined;
}

export interface VascularRiskAssessment {
	readonly techniqueId: ConductionTechniqueId;
	readonly needleId: NeedleGaugeId;
	readonly baseVascularHitRiskPercent: number;
	readonly adjustedVascularRiskPercent: number;
	readonly falseNegativeAspirationRiskPercent: number;
	readonly riskTier: VascularRiskTier;
	readonly isTwoPlaneAspirationMandatory: boolean;
	readonly needleGaugeAppropriate: boolean;
	readonly safetyWarningsRu: readonly string[];
	readonly clinicalRecommendationsRu: string;
}

export interface InjectionVelocityPlan {
	readonly volumeMl: number;
	readonly maxSafeVelocityMlPerMinute: number;
	readonly minRecommendedDurationSeconds: number;
	readonly absoluteFastestDurationSeconds: number;
	readonly safeInjectionInstructionsRu: string;
}

export interface AnesthesiaSessionData {
	readonly patientFullName?: string | undefined;
	readonly medCardNumber?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly hasCardiovascularRisk?: boolean | undefined;
	readonly toothNumber?: string | number | undefined;
	readonly side?: "right" | "left" | "bilateral" | undefined;
	readonly techniqueId: ConductionTechniqueId;
	readonly needleId: NeedleGaugeId;
	readonly drugKey: AnestheticDrugKey;
	readonly volumeMl: number;
	readonly aspirationStatus: AspirationTestStatus;
	readonly isTwoPlaneConfirmed: boolean;
	readonly attempts: readonly AspirationAttemptRecord[];
	readonly onsetDurationMinutesActual?: number | undefined;
	readonly notesRu?: string | undefined;
}

export interface Form043ExportResult {
	readonly diaryText043: string;
	readonly isLegalSafe: boolean;
	readonly complianceCheckPassed: boolean;
	readonly warningsRu: readonly string[];
}
