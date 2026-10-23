import type { ConsentTemplateKey } from "../templates/types";

export interface ConsentScopeMismatchItem {
	domainKey: ConsentTemplateKey;
	domainTitle: string;
	detectedKeywords: string[];
	procedureDescription: string;
	urgencyLevel: "invasive_surgery" | "invasive_orthopedics" | "invasive_orthodontics" | "therapy_uncovered";
}

export interface ConsentScopeMismatchParams {
	signedConsentKeys: readonly string[];
	treatmentPlanText?: string | null | undefined;
	diagnosisText?: string | null | undefined;
	complaintText?: string | null | undefined;
	anamnesisText?: string | null | undefined;
	objectiveStatusText?: string | null | undefined;
	additionalProcedures?: readonly string[] | null | undefined;
	isCito?: boolean | undefined;
}

export interface ConsentScopeMismatchResult {
	hasMismatch: boolean;
	hasSignedConsents: boolean;
	isCito: boolean;
	canProceed: boolean;
	mismatchedItems: ConsentScopeMismatchItem[];
	uncoveredTemplateKeys: ConsentTemplateKey[];
	uncoveredProcedureNames: string[];
	warningTitle: string;
	warningMessage: string;
	legalRiskNotice: string;
	suggestedActionLabel: string;
}
