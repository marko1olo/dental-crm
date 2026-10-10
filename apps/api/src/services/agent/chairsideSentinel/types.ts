/**
 * types.ts — Type definitions for Chairside Sentinel Engine.
 *
 * Layer 0: Pure Types & Contracts (0 runtime dependencies).
 * Mandate 8b / Mandate 8e:
 * Strict types for patient clinical context, safety alerts, SOAP diary,
 * Order 804n items, and autonomous action chains.
 */

export interface ChairsideVisitContextInput {
	patientId: string;
	toothNumber?: number | string | undefined;
	complaints?: string | undefined;
	diagnoses?: string[] | undefined;
	allergies?: string[] | undefined;
	somaticHistory?: string[] | undefined;
	activeServices?: string[] | undefined;
	mode?: "autonomous" | "supervised" | undefined;
	organizationId?: string | undefined;
}

export type ChairsideAlertSeverity = "critical" | "warning" | "info";

export type ChairsideAlertType =
	| "drug_allergy_conflict"
	| "allergy_notice"
	| "somatic_contraindication"
	| "somatic_advisory"
	| "bleeding_risk"
	| "pregnancy_advisory"
	| "anesthetic_allergy_warning"
	| "latex_allergy_warning"
	| "physiological_norm";

export interface ChairsideSafetyAlert {
	id: string;
	severity: ChairsideAlertSeverity;
	alertType: ChairsideAlertType;
	title: string;
	message: string;
	detectedAllergen?: string;
	conflictingItem?: string;
	safeAlternative?: string;
	clinicalRationale?: string;
	actionRequired?: string;
	/** Mandate 8e: always false! Warnings never block the doctor from proceeding */
	isBlocking: false;
}

export interface ChairsideSoapDiary {
	subjective: {
		complaints: string;
		anamnesisMorbi: string;
		anamnesisVitae: string;
	};
	objective: {
		statusLocalis: string;
		teethFormulaState: string;
		percussion: string;
		coldTest: string;
		probing: string;
		xrayFindings?: string;
	};
	assessment: {
		icd10Code: string;
		icd10Name: string;
		toothNumber: number | null;
		fdiToothFormatted: string;
	};
	plan: {
		procedureProtocol: string;
		recommendations: string;
	};
	renderedText043: string;
}

export interface ChairsideOrder804nItem {
	code: string;
	title: string;
	category: string;
	quantity: number;
	priceRub: number;
	priceKopecks: number;
	totalRub: number;
	totalKopecks: number;
	isMandatory: boolean;
	toothNumber?: number | null;
	canalCount?: number | null;
}

export interface ChairsideActionChainStep {
	step: string;
	description: string;
	status: "completed" | "failed";
	timestamp: string;
	details?: Record<string, unknown>;
}

export interface ChairsideSentinelAnalysisResult {
	patientId: string;
	toothNumber: number | null;
	fdiToothFormatted: string;
	mode: "autonomous" | "supervised";
	status: "auto_approved_draft" | "draft_pending_review";
	autoApprovedDraft: boolean;
	readyForOneClickApply: boolean;
	doctorAutonomyGuaranteed: boolean;
	somaticStatus: string;
	allergiesStatus: string;
	isPhysiologicalNorm: boolean;
	alerts: ChairsideSafetyAlert[];
	soapDiary: ChairsideSoapDiary;
	order804n: {
		services: ChairsideOrder804nItem[];
		totalRub: number;
		totalKopecks: number;
		formattedTotal: string;
	};
	actionChain: ChairsideActionChainStep[];
}

export type ClinicalCategory =
	| "pulpitis"
	| "caries"
	| "periodontitis"
	| "surgery"
	| "hygiene"
	| "preventive";

export interface ClinicalCategoryDetectionResult {
	primaryIcd10: string;
	diagnosisName: string;
	clinicalCategory: ClinicalCategory;
}

export interface SoapDiaryGenerationParams {
	toothNumber: number | null;
	canalCount: number;
	primaryIcd10: string;
	diagnosisName: string;
	clinicalCategory: ClinicalCategory;
	complaints?: string | undefined;
	somaticStatus: string;
	allergiesStatus: string;
}

export interface Order804nCalculationParams {
	toothNumber: number | null;
	canalCount: number;
	clinicalCategory: ClinicalCategory;
	primaryIcd10: string;
}

export interface DrugAndSomaticCheckResult {
	alerts: ChairsideSafetyAlert[];
	somaticStatus: string;
	allergiesStatus: string;
	isPhysiologicalNorm: boolean;
}
