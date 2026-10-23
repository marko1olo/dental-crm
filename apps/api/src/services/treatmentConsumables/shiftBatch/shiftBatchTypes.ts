/**
 * shiftBatchTypes.ts — Layer 0: Contracts for shift consumables summary and batch write-offs.
 */

export interface ShiftSummaryProcedure {
	name: string;
	code?: string;
	count: number;
}

export interface ShiftConsumableSummaryItem {
	itemId: string;
	itemName: string;
	category: string;
	unit: string;
	qtyToDeduct: number;
	currentStock: number;
	projectedStock: number;
	isOverdraft: boolean;
	deficit: number;
	defaultCostRub?: string;
}

export interface ShiftConsumablesSummaryResult {
	date: string;
	shiftStats: {
		completedVisitsCount: number;
		totalProceduresCount: number;
		breakdown: ShiftSummaryProcedure[];
	};
	consumablesSummary: ShiftConsumableSummaryItem[];
	totalItemsCount: number;
	overdraftItemsCount: number;
	isAlreadyDeducted: boolean;
}

export interface ExecuteShiftBatchDeductionParams {
	organizationId: string;
	date?: string | null | undefined;
	userId?: string | null | undefined;
	items?: Array<{ itemId: string; qty: number; name?: string | undefined }> | undefined;
	notes?: string | null | undefined;
}

export interface ExecuteShiftBatchDeductionResult {
	success: boolean;
	isOverdraft: boolean;
	date: string;
	deductedItems: Array<{
		itemId: string;
		itemName: string;
		quantity: number;
		unit: string;
		remainingStock: number;
		isOverdraft: boolean;
	}>;
	warnings: string[];
	message: string;
}
