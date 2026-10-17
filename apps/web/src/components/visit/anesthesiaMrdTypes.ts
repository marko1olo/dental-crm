/**
 * anesthesiaMrdTypes.ts
 * Type definitions for Maximum Recommended Dose (MRD) calculation.
 */

import type {
	MrdDrugId,
	CarpuleVolumeMl,
	PediatricFormula,
	SafetyZone,
	LimitingFactor,
	MrdDrugSpecification,
} from "./anesthesiaMrdCatalog.js";

export interface MrdCalculationParams {
	readonly drugId: MrdDrugId;
	readonly patientWeightKg?: number | null;
	readonly carpulesCount?: number;
	readonly carpuleVolumeMl?: number | CarpuleVolumeMl;
	readonly isCardiacRisk?: boolean;
	readonly isPediatric?: boolean;
	readonly patientAgeYears?: number | null;
	readonly pediatricFormula?: PediatricFormula;
	readonly hasSulfiteAllergy?: boolean;
	readonly hasBronchialAsthma?: boolean;
}

export interface MrdCalculationResult {
	readonly drug: MrdDrugSpecification;
	readonly patientWeightKg: number;
	readonly carpuleVolumeMl: number;
	readonly mgActivePerCarpule: number;
	readonly mgEpiPerCarpule: number;
	readonly carpulesCount: number;
	readonly injectedVolumeMl: number;
	readonly injectedActiveMg: number;
	readonly injectedEpinephrineMg: number;
	readonly maxSafeActiveMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly maxSafeCarpulesCount: number;
	readonly maxSafeVolumeMl: number;
	readonly remainingSafeActiveMg: number;
	readonly remainingSafeEpinephrineMg: number;
	readonly remainingSafeCarpules: number;
	readonly activeDosePercent: number;
	readonly epinephrineDosePercent: number;
	readonly peakUtilizationPercent: number;
	readonly safetyZone: SafetyZone;
	readonly isOverdose: boolean;
	readonly isEpinephrineOverdose: boolean;
	readonly speedoMeterLabelRu: string;
	readonly speedoMeterColorHex: string;
	readonly limitingFactor: LimitingFactor;
	readonly limitingFactorDescriptionRu: string;
	readonly isCardiacRestricted: boolean;
	readonly cardiacGateActive: boolean;
	readonly isPediatric: boolean;
	readonly isPediatricScaled: boolean;
	readonly pediatricFormulaUsed: PediatricFormula | null;
	readonly pediatricScalingFactor: number;
	readonly warnings: readonly string[];
	readonly contraindications: readonly string[];
	readonly soapDiaryText: string;
}
