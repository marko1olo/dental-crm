import type { ClinicLegalInfo } from "../engine/index.js";
import type { ShiftSanpinAutoCloseResult } from "./types.js";

export interface MonthSanpinBatchOptions {
	readonly year: number;
	readonly month: number; // 1-12
	readonly excludeSundays?: boolean | undefined;
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
