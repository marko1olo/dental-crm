/**
 * @dental/shared/anesthesia/types/safetyTypes.ts
 * Clinical Safety Levels, ASA Classification & Somatic Risk Profiles (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaDrugKey } from "./drugTypes.js";

export type AnesthesiaSafetyZone = "safe" | "caution" | "warning" | "overdose_danger" | "REQUIRES_WEIGHT_INPUT";
export type AnesthesiaSafetyLevel = "safe" | "caution" | "warning" | "danger" | "REQUIRES_WEIGHT_INPUT";
export type SomaticAlertSeverity = "danger" | "warning" | "caution" | "info" | "safe";

export type AsaClassification = "asa_1" | "asa_2" | "asa_3" | "asa_4";
export type AsaPhysicalStatus = AsaClassification;

export interface AnesthesiaCarpuleBatchInfo {
	readonly seriesNumber: string;
	readonly batchNumber: string;
	readonly expirationDate: string; // Формат ГГГГ-ММ или ГГГГ-ММ-ДД
	readonly manufacturerRu?: string | undefined;
	readonly isExpired?: boolean | undefined;
}

export interface PreoperativeVitalsChecklist {
	readonly bpSystolic?: number | undefined;
	readonly bpDiastolic?: number | undefined;
	readonly heartRateBpm?: number | undefined;
	readonly spo2Percent?: number | undefined;
	readonly bodyTemperatureCelsius?: number | undefined;
	readonly measuredAt?: string | undefined;
	readonly isHemodynamicallyStable?: boolean | undefined;
	readonly vitalWarnings?: readonly string[] | undefined;
}

export interface SomaticRiskProfile {
	readonly hasCardiovascularRisk?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasSevereHypertensionStage3?: boolean | undefined;
	readonly hasIhd?: boolean | undefined;
	readonly hasArrhythmia?: boolean | undefined;
	readonly hasThyrotoxicosis?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasMepivacaineAllergy?: boolean | undefined;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isPregnantOrLactating?: boolean | undefined;
	readonly pregnancyTrimester?: "none" | "trimester_1" | "trimester_2" | "trimester_3" | "lactation" | undefined;
	readonly bpSystolic?: number | undefined;
	readonly bpDiastolic?: number | undefined;
	readonly heartRateBpm?: number | undefined;
	readonly spo2Percent?: number | undefined;
	readonly vitalsChecklist?: PreoperativeVitalsChecklist | undefined;
	readonly customNotes?: string | undefined;
}

export interface AnesthesiaSomaticAlert {
	readonly id: string;
	readonly severity: SomaticAlertSeverity;
	readonly title: string;
	readonly message: string;
	readonly recommendedDrugKey?: AnesthesiaDrugKey | undefined;
	readonly recommendedAction?: string | undefined;
}

export interface SomaticCrossCheckResult {
	readonly hasContraindications: boolean;
	readonly alerts: readonly AnesthesiaSomaticAlert[];
	readonly recommendedDrugKey: AnesthesiaDrugKey | null;
	readonly maxCardioCarpules: number | null;
	readonly totalEpinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly isCardioRestricted: boolean;
	readonly cardioLimitBadgeText: string | null;
	readonly cardioLimitDetails: {
		readonly maxEpinephrineMg: number;
		readonly maxCarpules: number | null;
		readonly currentEpinephrineMg: number;
		readonly isExceeded: boolean;
	} | null;
}
