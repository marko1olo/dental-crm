/**
 * prescriptionDosageTypes.ts — Dosage Calculation & Validation Types
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

export interface DosageCalculationParams {
	readonly drugId: string;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
}

export interface DosageCalculationResult {
	readonly drugNameRu: string;
	readonly recommendedDosageRu: string;
	readonly standardFrequencyRu: string;
	readonly maxDailyDoseRu: string;
	readonly isPediatric: boolean;
	readonly warningRu?: string | undefined;
	readonly isContraindicated?: boolean | undefined;
	readonly contraindicationReason?: string | undefined;
	readonly singleDoseMg?: number | undefined;
	readonly maxDailyDoseMg?: number | undefined;
	readonly maxCarpules?: number | undefined;
}

export interface DosageValidationParams {
	readonly drugIdOrMnn?: string;
	readonly medicationKey?: string;
	readonly dosageText?: string | undefined;
	readonly singleDoseMg?: number | undefined;
	readonly prescribedDoseMg?: number | undefined;
	readonly dailyDoseMg?: number | undefined;
	readonly carpulesCount?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
}

export interface DosageValidationResult {
	readonly isValid: boolean;
	readonly isPediatric: boolean;
	readonly status: "normal" | "warning" | "contraindicated";
	readonly messageRu: string;
	readonly calculatedMaxDoseRu?: string | undefined;
	readonly errors: readonly string[];
}
