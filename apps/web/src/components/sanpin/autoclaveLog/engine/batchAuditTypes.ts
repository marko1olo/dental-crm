import type {
	PackagingTypeId,
	SterilizationRegimeId,
} from "../autoclaveLogPresets.js";
import type {
	ChamberPointEvaluation,
	ClinicLegalInfo,
	Form257Record,
	PhysicalSensorsData,
} from "./cycleTypes.js";

export interface Form257FilterCriteria {
	readonly searchQuery?: string | undefined;
	readonly startDate?: string | undefined;
	readonly endDate?: string | undefined;
	readonly sterilizerId?: string | undefined;
	readonly regimeId?: SterilizationRegimeId | "all" | undefined;
	readonly status?: "all" | "sterile_passed" | "rejected_defect" | "quarantine" | undefined;
}

export interface SterilizerStatisticsSummary {
	readonly totalCycles: number;
	readonly successfulCycles: number;
	readonly failedCycles: number;
	readonly successRatePercent: number;
	readonly totalPacksProcessed: number;
	readonly cyclesByRegime: Readonly<Record<string, number>>;
	readonly cyclesBySterilizer: Readonly<Record<string, number>>;
	readonly bioTestsTotal: number;
	readonly bioTestsPassed: number;
	readonly bioTestsFailed: number;
	readonly nextBioControlOverdue: boolean;
	readonly daysUntilNextBioControl: number;
}

export interface CreateForm257RecordParams {
	readonly date: string;
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly sterilizerCode?: string | undefined;
	readonly sterilizerBrandModel?: string | undefined;
	readonly sterilizerSerialNumber?: string | undefined;
	readonly regimeId: SterilizationRegimeId;
	readonly sensors: PhysicalSensorsData;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly bixNumber?: string | undefined;
	readonly packagingType: PackagingTypeId;
	readonly chamberPoints: readonly ChamberPointEvaluation[];
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition?: string | undefined;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified?: boolean | undefined;
	readonly bioTestId?: string | undefined;
	readonly bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	readonly notes?: string | undefined;
}

export interface MissingSterilizationDaysAuditResult {
	readonly auditedDatesCount: number;
	readonly missingDatesCount: number;
	readonly missingDates: readonly string[];
	readonly isMissingAutoclaveLog: boolean;
	readonly warningMessageRu?: string | undefined;
	readonly recommendationRu?: string | undefined;
}

export interface RegulatoryPsoRecord {
	readonly id: string;
	readonly date: string;
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly isBatchApproved: boolean;
	readonly detergentBrand?: string | undefined;
	readonly operatorFullName: string;
	readonly notes?: string | undefined;
}

export interface RegulatoryInspectionData {
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly periodLabelRu?: string | undefined;
	readonly form257Records: readonly Form257Record[];
	readonly psoRecords?: readonly RegulatoryPsoRecord[] | undefined;
}

export interface GenerateBatchForm257Options {
	readonly startDate?: string | undefined;
	readonly endDate?: string | undefined;
	readonly targetDates?: readonly string[] | undefined;
	readonly excludeSundays?: boolean | undefined;
	readonly cyclesPerDay?: number | undefined;
	readonly packsPerCycle?: number | undefined;
	readonly sterilizerId?: string | undefined;
	readonly sterilizerCode?: string | undefined;
	readonly sterilizerBrandModel?: string | undefined;
	readonly sterilizerSerialNumber?: string | undefined;
	readonly operatorStaffFullName?: string | undefined;
	readonly operatorStaffPosition?: string | undefined;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified?: boolean | undefined;
}

export interface PackageBarcodePayloadParams {
	readonly batchId: string;
	readonly cycleNumber: number;
	readonly sterilizerCode: string;
	readonly packDate: string;
	readonly packIndex: number;
	readonly shelfLifeDays?: number | undefined;
	readonly itemsDescriptionRu?: string | undefined;
	readonly operatorStaffFullName?: string | undefined;
}

export interface PackageBarcodeInfo {
	readonly serialNumber: string;
	readonly barcodePayload: string;
	readonly packDate: string;
	readonly expirationDate: string;
	readonly shelfLifeDays: number;
	readonly cycleId: string;
}
