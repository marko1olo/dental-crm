/**
 * @dental/shared/anesthesia/types/calcMrdTypes.ts
 * Patient MRD Calculation & Autopilot Resolution Types (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaDrugDefinition, AnesthesiaDrugKey } from "./drugTypes.js";
import type { SomaticCrossCheckResult } from "./safetyTypes.js";

export interface PatientMrdCalculation {
	readonly drugKey: AnesthesiaDrugKey;
	readonly commercialName: string;
	readonly activeSubstance: string;
	readonly patientWeightKg: number;
	readonly isPediatric: boolean;
	readonly maxDoseMgPerKg: number;
	readonly mrdDoseMg: number;
	readonly mrdVolumeMl: number;
	readonly mrdCarpules: number;
	readonly isCappedByAbsoluteMax: boolean;
	readonly isCappedByCardio: boolean;
	readonly maxSafeEpinephrineMg: number;
	readonly cardioLimitBadgeText: string | null;
	readonly formattedNoteRu: string;
	readonly status?: "OK" | "REQUIRES_WEIGHT_INPUT" | undefined;
	readonly requiresWeightInput?: boolean | undefined;
}

export interface AutopilotResolutionResult {
	readonly selectedDrugKey: AnesthesiaDrugKey;
	readonly drug: AnesthesiaDrugDefinition;
	readonly rationaleRu: string;
	readonly badgeText: string;
	readonly isCardioRestricted: boolean;
	readonly cardioLimitBadgeText: string | null;
	readonly mrdDoseMg: number;
	readonly mrdVolumeMl: number;
	readonly mrdCarpules: number;
	readonly maxSafeVolumeMl: number;
	readonly maxSafeEpinephrineMg: number;
	readonly crossCheck: SomaticCrossCheckResult;
}
