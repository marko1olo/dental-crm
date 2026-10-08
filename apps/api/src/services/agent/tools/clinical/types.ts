/**
 * @file types.ts
 * @description Layer 0: Data contracts, parameter interfaces, and response types for clinical agent tools.
 */

export interface DrugSafetyAuditParams {
	patientId?: string | undefined;
	organizationId?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: Database instance
	targetDb?: any;
	proposedMedications: string[];
	existingMedications?: string[] | undefined;
	patientConditions?: string[] | undefined;
	knownAllergies?: string[] | undefined;
}

export interface DrugSafetyAuditResult {
	isSafe: boolean;
	riskLevel: "safe" | "caution" | "critical_danger";
	hasAllergyClash: boolean;
	hasSevereDdi: boolean;
	hasConditionContraindication: boolean;
	blockedPrescriptions: string[];
	allergyWarnings: {
		allergenGroup: string;
		proposedDrug: string;
		severity: string;
		manifestations: string;
	}[];
	drugInteractions: {
		primaryDrug: string;
		interactingDrug: string;
		severity: "critical" | "high" | "moderate" | "minor";
		effectDescriptionRu: string;
		clinicalRecommendationRu: string;
	}[];
	conditionContraindications: {
		condition: string;
		proposedDrug: string;
		severity: "critical" | "high" | "warning" | "moderate" | "minor";
		reasonRu: string;
		clinicalGuidanceRu: string;
	}[];
	safeAlternativeRecommendations: {
		originalDrug: string;
		recommendedAlternatives: string[];
		rationaleRu: string;
	}[];
	summaryRu: string;
}

export interface TimelineEvent {
	readonly id: string;
	readonly type: "visit" | "treatment_plan" | "payment" | "lab_order";
	readonly title: string;
	readonly date: string;
	readonly details: Record<string, unknown>;
}
