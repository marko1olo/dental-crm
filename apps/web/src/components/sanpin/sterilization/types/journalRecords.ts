import type { ChamberControlPoint, ChemicalIndicatorClassId } from "./indicatorsData";
import type { KraftPackagingType, SterilityStatus } from "./packagingData";
import type { SterilizationRegimeCode } from "./regimesData";

export interface AutoclaveCycleRecord {
	readonly id: string;
	readonly date: string; // YYYY-MM-DD
	readonly time: string; // HH:mm
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly sterilizerBrandModel: string;
	readonly regimeId: SterilizationRegimeCode;
	readonly regimeNameRu: string;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly packagingType: KraftPackagingType;
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly indicatorClass: ChemicalIndicatorClassId;
	readonly indicatorTradeNameRu: string;
	readonly chamberPoints: readonly ChamberControlPoint[];
	readonly areAllIndicatorsPassed: boolean;
	readonly cycleStatus: "passed" | "failed";
	readonly failureReasons: readonly string[];
	readonly operatorFullName: string;
	readonly operatorPosition: string;
	readonly electronicSignatureHash: string;
	readonly notes?: string;
	readonly createdAt: string;
}

/** Алиас для обратной совместимости (Мандат 8ap) */
export type Form257CycleRecord = AutoclaveCycleRecord;

export interface PsoTestRecord {
	readonly id: string;
	readonly date: string; // YYYY-MM-DD
	readonly time: string; // HH:mm
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly minSampleRequired: number;
	readonly isSamplingSufficient: boolean;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly isSudanNegative: boolean;
	readonly detergentBrand: string;
	readonly isBatchApproved: boolean;
	readonly rejectionReason: string | null;
	readonly operatorFullName: string;
	readonly operatorPosition: string;
	readonly electronicSignatureHash: string;
	readonly notes?: string;
	readonly createdAt: string;
}

export interface KraftPackageItem {
	readonly id: string;
	readonly barcode: string;
	readonly batchNumber: string;
	readonly packageSerialNumber: number;
	readonly toolSetNameRu: string;
	readonly itemsIncluded: readonly string[];
	readonly packagingType: KraftPackagingType;
	readonly packagingNameRu: string;
	readonly sterilizerCode: string;
	readonly cycleNumber: number;
	readonly packDate: string; // YYYY-MM-DD
	readonly expDate: string; // YYYY-MM-DD
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: SterilityStatus;
	readonly operatorFullName: string;
	readonly indicatorVerified: boolean;
	readonly notes?: string;
	readonly createdAt: string;
}
