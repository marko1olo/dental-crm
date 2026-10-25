/**
 * @dental/shared/anesthesia/types/calcResultTypes.ts
 * Clinical Calculation Results & Output Types (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaDrugDefinition, AnesthesiaDrugKey, AnesthesiaDrugSpec, AnestheticDrugId } from "./drugTypes.js";
import type {
	AnesthesiaCarpuleBatchInfo,
	AnesthesiaSafetyLevel,
	AnesthesiaSafetyZone,
	AnesthesiaSomaticAlert,
	PreoperativeVitalsChecklist,
	SomaticRiskProfile,
} from "./safetyTypes.js";

export type { PatientMrdCalculation, AutopilotResolutionResult } from "./calcMrdTypes.js";

export interface ComprehensiveAnesthesiaCalculationResult {
	readonly drug: AnesthesiaDrugSpec;
	readonly carpulesCount: number;
	readonly carpuleVolumeMl: number;
	readonly injectedVolumeMl: number;
	readonly injectedActiveMg: number;
	readonly injectedEpinephrineMg: number;
	readonly maxSafeActiveMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly maxSafeCarpulesCount: number;
	readonly maxSafeVolumeMl: number;
	readonly remainingSafeActiveMg: number;
	readonly remainingSafeEpinephrineMg: number;
	readonly remainingSafeCarpulesCount: number;
	readonly percentOfMaxDose: number;
	readonly percentOfEpiMaxDose: number;
	readonly peakUtilizationPercent: number;
	readonly effectiveMaxMgPerKg: number;
	readonly isPediatric: boolean;
	readonly isGeriatric: boolean;
	readonly ageReductionFactor: number;
	readonly safetyZone: AnesthesiaSafetyZone;
	readonly isOverdose: boolean;
	readonly isEpinephrineOverdose: boolean;
	readonly isBlocked: boolean;
	readonly limitingFactor: string;
	readonly blockingContraindications: readonly string[];
	readonly warnings: readonly string[];
	readonly recommendedAlternativeId?: AnestheticDrugId | undefined;
	readonly recommendedAlternativeKey?: AnestheticDrugId | undefined;
	readonly clinicalAdviceRu: string;
	readonly soapDiaryText: string;
	readonly carpuleBatch?: AnesthesiaCarpuleBatchInfo | undefined;
	readonly vitalsSafety?: PreoperativeVitalsChecklist | undefined;
	readonly status?: "OK" | "REQUIRES_WEIGHT_INPUT" | undefined;
	readonly requiresWeightInput?: boolean | undefined;
}

export interface VisitAnesthesiaCalculationResult {
	readonly drug: AnesthesiaDrugDefinition;
	readonly patientWeightKg: number;
	readonly isPediatric: boolean;
	readonly effectiveMaxMgPerKg: number;
	readonly carpulesCount: number;
	readonly totalVolumeMl: number;
	readonly totalDoseMg: number;
	readonly maxSafeDoseMg: number;
	readonly maxSafeVolumeMl: number;
	readonly maxSafeCarpules: number;
	readonly mrdDoseMg: number;
	readonly mrdVolumeMl: number;
	readonly mrdCarpules: number;
	readonly totalEpinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly safetyRatio: number;
	readonly safetyLevel: AnesthesiaSafetyLevel;
	readonly safetyPercentage: number;
	readonly warningMessage: string | null;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly somaticAlerts: readonly AnesthesiaSomaticAlert[];
	readonly recommendedDrugKey: AnesthesiaDrugKey | null;
	readonly isCardioRestricted: boolean;
	readonly cardioLimitBadgeText: string | null;
	readonly cardioLimitDetails: {
		readonly maxEpinephrineMg: number;
		readonly maxCarpules: number | null;
		readonly currentEpinephrineMg: number;
		readonly isExceeded: boolean;
	} | null;
	readonly carpuleBatch?: AnesthesiaCarpuleBatchInfo | undefined;
	readonly status?: "OK" | "REQUIRES_WEIGHT_INPUT" | undefined;
	readonly requiresWeightInput?: boolean | undefined;
}
