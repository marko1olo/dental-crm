/**
 * ============================================================================
 * SANPIN KRAFT PACKAGE TYPES & INTERFACES (СанПиН 3.3686-21)
 * ============================================================================
 */

import type { KraftPackageMaterialId, KraftPackageSizeId } from "./kraftPackagePresets";

export type KraftPackageStatus =
	| "sterile_valid"
	| "expiring_soon_7d"
	| "expired"
	| "recalled";

export interface KraftPackageRecord {
	readonly id: string;
	readonly batchId: string;
	readonly serialNumber: number;
	readonly packageType: KraftPackageMaterialId;
	readonly packageSize: KraftPackageSizeId;
	readonly toolSetId: string;
	readonly toolSetNameRu: string;
	readonly itemsListRu: readonly string[];
	readonly packDate: string; // ISO String (YYYY-MM-DD or full ISO)
	readonly expDate: string; // ISO String
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: KraftPackageStatus;
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly operatorId: string;
	readonly operatorName: string;
	readonly indicatorId: string;
	readonly indicatorVerified: boolean;
	readonly barcode128: string;
	readonly barcodeDataMatrixPayload: string;
	readonly isBreached: boolean;
	readonly notes: string;
	readonly createdAt: string;
}

export interface KraftBatchOptions {
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly packageType: KraftPackageMaterialId;
	readonly packageSize: KraftPackageSizeId;
	readonly toolSetId: string;
	readonly customItems?: readonly string[];
	readonly quantity: number;
	readonly operatorId?: string;
	readonly operatorName?: string;
	readonly indicatorId?: string;
	readonly indicatorVerified?: boolean;
	readonly customPackDate?: string;
	readonly customBatchId?: string;
	readonly notes?: string;
}

export interface ExpirationCalculationResult {
	readonly packDateFormatted: string;
	readonly expDateFormatted: string;
	readonly expDateIso: string;
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: KraftPackageStatus;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly humanReadableRemainingRu: string;
}

export interface KraftBatchStatistics {
	readonly totalPacks: number;
	readonly sterileValidCount: number;
	readonly expiringSoonCount: number;
	readonly expiredCount: number;
	readonly recalledCount: number;
	readonly verifiedIndicatorCount: number;
}
