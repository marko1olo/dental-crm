import type {
	ClinicLegalInfo,
	Form257Record,
	RegulatoryPsoRecord,
} from "../engine/index.js";

export * from "./monthBatchTypes.js";

export interface ShiftSanpinAutoCloseOptions {
	readonly date?: string | undefined;
	readonly visitsCount?: number | undefined;
	readonly traysCount?: number | undefined;
	readonly operatorStaffFullName?: string | undefined;
	readonly operatorStaffPosition?: string | undefined;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly sterilizerId?: string | undefined;
	readonly sterilizerCode?: string | undefined;
	readonly sterilizerBrandModel?: string | undefined;
	readonly sterilizerSerialNumber?: string | undefined;
	readonly refrigeratorTempCelsius?: number | undefined;
	readonly roomTempCelsius?: number | undefined;
	readonly roomHumidityPercent?: number | undefined;
	readonly dezarOperatingHours?: number | undefined;
	readonly detergentBrand?: string | undefined;
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
