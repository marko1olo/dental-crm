export type FefoTrafficStatus = "green" | "yellow" | "red";

export interface FefoTrafficLightInfo {
	readonly status: FefoTrafficStatus;
	readonly daysLeft: number;
	readonly label: string;
	readonly badgeText: string;
	readonly className: string;
	readonly dotColor: string;
	readonly bgClass: string;
	readonly textClass: string;
	readonly borderClass: string;
	readonly tooltip: string;
}

export type ExpiryTrafficLight = FefoTrafficLightInfo;

export interface FefoTrafficLightOptions {
	readonly redDays?: number;
	readonly yellowDays?: number;
	readonly warehouseMode?: boolean;
}

export interface ClinicalBatchValidationResult {
	readonly isAllowed: boolean;
	readonly isExpired: boolean;
	readonly alertMessage: string | null;
	readonly formattedExpiry: string;
	readonly status: FefoTrafficStatus;
	readonly daysLeft: number;
}

export interface FefoBatchAllocation<T> {
	readonly batch: T;
	readonly allocatedQuantity: number;
}

export interface FefoDeductionResolutionResult<T> {
	readonly allocatedBatches: ReadonlyArray<FefoBatchAllocation<T>>;
	readonly allocatedTotalQuantity: number;
	readonly remainingDeficit: number;
	readonly blockedExpiredBatches: ReadonlyArray<{
		readonly batch: T;
		readonly alertMessage: string;
	}>;
	readonly hasOverdraft: boolean;
}
