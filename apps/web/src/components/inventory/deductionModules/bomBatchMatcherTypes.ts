export interface BatchCandidate {
	readonly id?: string | undefined;
	readonly itemId: string;
	readonly batchNumber: string;
	readonly expiryDate: string;
	readonly stockQuantity: number;
	readonly chairId?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly locationId?: string | undefined;
}

export interface BatchResolutionResult {
	readonly validStockMap: Record<string, number>;
	readonly quarantinedBatchesCount: number;
}

export interface MatchBatchAllocation {
	readonly batchNumber: string;
	readonly expiryDate: string;
	readonly allocatedQuantity: number;
}
