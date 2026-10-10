/**
 * ============================================================================
 * SANPIN SHIFT CLOSER TYPES & CONTRACTS (LAYER 0)
 * (СанПиН 3.3686-21, СанПиН 2.1.3684-21, Р 3.5.1904-04, Приказ 706н)
 * ============================================================================
 */

import type {
	ClinicLegalInfo,
	Form257Record,
	RegulatoryPsoRecord,
} from "../engine/index.js";

export interface ShiftSanpinAutoCloseOptions {
	readonly date?: string | undefined; // YYYY-MM-DD (defaults to today)
	readonly visitsCount?: number | undefined; // Visited patients (default 12)
	readonly traysCount?: number | undefined; // Dental instrument packs/trays (default visits * 4)
	readonly operatorStaffFullName?: string | undefined;
	readonly operatorStaffPosition?: string | undefined;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly sterilizerId?: string | undefined;
	readonly sterilizerCode?: string | undefined;
	readonly sterilizerBrandModel?: string | undefined;
	readonly sterilizerSerialNumber?: string | undefined;
	readonly refrigeratorTempCelsius?: number | undefined; // Pozis default 4.2°C (norm 2..8°C)
	readonly roomTempCelsius?: number | undefined; // VIT-2 psychrometer default 21.2°C (norm 18..25°C)
	readonly roomHumidityPercent?: number | undefined; // VIT-2 psychrometer default 55% (norm 40..60%)
	readonly dezarOperatingHours?: number | undefined; // Dezar-4 default 1.5 h
	readonly detergentBrand?: string | undefined; // default "Биолот 0.5% + Аламинол 1.5%"
	readonly clinicInfo?: Partial<ClinicLegalInfo> | undefined;
}

export interface ShiftMicroclimateLogs {
	readonly refrigeratorLog: {
		readonly equipmentName: string;
		readonly locationRoom: string;
		readonly meterDeviceName: string;
		readonly meterSerialNumber: string;
		readonly morningTempCelsius: number;
		readonly eveningTempCelsius: number;
		readonly targetMinCelsius: number;
		readonly targetMaxCelsius: number;
		readonly isWithinNorm: boolean;
	};
	readonly psychrometerLog: {
		readonly equipmentName: string;
		readonly locationRoom: string;
		readonly meterDeviceName: string;
		readonly meterSerialNumber: string;
		readonly morningTempCelsius: number;
		readonly morningHumidityPercent: number;
		readonly eveningTempCelsius: number;
		readonly eveningHumidityPercent: number;
		readonly targetTempMinCelsius: number;
		readonly targetTempMaxCelsius: number;
		readonly targetHumidityMinPercent: number;
		readonly targetHumidityMaxPercent: number;
		readonly isWithinNorm: boolean;
	};
}

export interface ShiftBactericidalLog {
	readonly deviceBrand: string;
	readonly locationRoom: string;
	readonly operatingHours: number;
	readonly sessionsCount: number;
	readonly morningSessionDurationMin: number;
	readonly intraShiftSessionDurationMin: number;
	readonly cumulativeLampHours: number;
	readonly maxLampHours: number;
	readonly isLampNorm: boolean;
}

export interface ShiftMedicalWasteLog {
	readonly classBWeightKg: number;
	readonly classAWeightKg: number;
	readonly descriptionRu: string;
	readonly packageTypeRu: string;
	readonly treatmentMethodRu: string;
}

export interface ShiftSanpinAutoCloseResult {
	readonly date: string;
	readonly timestamp: string;
	readonly visitsCount: number;
	readonly traysCount: number;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly headNurseSignatureFullName: string;
	readonly form257Records: readonly Form257Record[];
	readonly totalAutoclaveCycles: number;
	readonly totalSterilePacks: number;
	readonly psoBatches: readonly RegulatoryPsoRecord[];
	readonly totalPsoItems: number;
	readonly totalPsoSamplesTested: number;
	readonly isPsoCompliant: boolean;
	readonly microclimate: ShiftMicroclimateLogs;
	readonly bactericidal: ShiftBactericidalLog;
	readonly waste: ShiftMedicalWasteLog;
	readonly digitalStampHash: string;
	readonly complianceSummaryRu: string;
}

export interface MonthSanpinBatchOptions {
	readonly year: number;
	readonly month: number; // 1-12
	readonly excludeSundays?: boolean | undefined; // default true
	readonly operatorStaffFullName?: string | undefined;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly averageVisitsPerDay?: number | undefined;
	readonly sterilizerBrandModel?: string | undefined;
	readonly clinicInfo?: Partial<ClinicLegalInfo> | undefined;
}

export interface MonthSanpinBatchResult {
	readonly year: number;
	readonly month: number;
	readonly monthLabelRu: string;
	readonly totalDays: number;
	readonly workingDaysCount: number;
	readonly shiftResults: readonly ShiftSanpinAutoCloseResult[];
	readonly aggregateStats: {
		readonly totalVisits: number;
		readonly totalTraysProcessed: number;
		readonly totalPsoSamplesTested: number;
		readonly totalAutoclaveCycles: number;
		readonly totalDezarOperatingHours: number;
		readonly generalCleaningsCount: number;
		readonly totalWasteBWeightKg: number;
		readonly totalWasteAWeightKg: number;
		readonly complianceRatePercent: number;
	};
	readonly complianceStatementRu: string;
}

export interface PersistShiftSanpinOptions {
	readonly organizationId?: string | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
}

export interface PersistShiftSanpinResult {
	readonly success: boolean;
	readonly persistedOnline: boolean;
	readonly date: string;
	readonly digitalStampHash: string;
	readonly messageRu: string;
}
