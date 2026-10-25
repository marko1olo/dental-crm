/**
 * prescriptionMnnTypes.ts — Statutory MNN Catalog & Latin Rx Signa Types
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

export interface DentalMnnDefinition {
	readonly id: string;
	readonly key?: string;
	readonly mnnRu: string;
	readonly mnnLatin: string;
	readonly aliasesRu: readonly string[];
	readonly category:
		| "antibiotic"
		| "nsaid"
		| "antiseptic"
		| "anesthetic"
		| "antihistamine"
		| "dental_gel"
		| "other";
	readonly categoryLabelRu: string;
	readonly standardDosages: readonly string[];
	readonly maxSingleDoseRu: string;
	readonly maxDailyDoseRu: string;
	readonly pediatricNotesRu?: string | undefined;
	readonly standardSignaLatinPrefix: string;
	readonly standardSignaRussianTemplate: string;
}

export interface DentalMnnValidationResult {
	readonly isValid: boolean;
	readonly matchedMnn?: DentalMnnDefinition | undefined;
	readonly normalizedQuery: string;
	readonly messageRu: string;
	readonly isTradeName?: boolean | undefined;
	readonly warning?: string | undefined;
}

export interface LatinRxSignaValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
	readonly parsedComponents: {
		readonly hasRpPrefix: boolean;
		readonly hasDispenseDtd: boolean;
		readonly hasSignaPrefix: boolean;
		readonly cleanedSignaRu: string;
	};
}
