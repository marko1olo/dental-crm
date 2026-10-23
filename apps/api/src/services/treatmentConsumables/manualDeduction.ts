/**
 * manualDeduction.ts — Layer 2: Emergency manual item deductions with guaranteed soft overdraft.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

import type { StockDeductionRecord, StockDeductionWarning } from "@dental/shared";
import type { DbExecutor } from "./types.js";
import {
	aggregateManualDeductionItems,
	type ManualDeductionInputItem,
} from "./manualDeduction/manualDeductionAggregator.js";
import { executeManualDeductionLoop } from "./manualDeduction/manualDeductionExecution.js";

export type { ManualDeductionInputItem };

export async function deductManualItems(
	tx: DbExecutor,
	params: {
		organizationId: string;
		items: ManualDeductionInputItem[];
		visitId?: string | null | undefined;
		userId?: string | null | undefined;
		notes?: string | null | undefined;
		allowOverdraft?: boolean | undefined;
	},
): Promise<{
	success: boolean;
	isOverdraft: boolean;
	completedItemsCount: number;
	deductions: StockDeductionRecord[];
	warnings: StockDeductionWarning[];
}> {
	const aggregated = aggregateManualDeductionItems(params.items);
	if (aggregated.sortedIds.length === 0) {
		return {
			success: true,
			isOverdraft: false,
			completedItemsCount: 0,
			deductions: [],
			warnings: [],
		};
	}

	const result = await executeManualDeductionLoop(tx, {
		organizationId: params.organizationId,
		aggregated,
		visitId: params.visitId,
		userId: params.userId,
		notes: params.notes,
		allowOverdraft: params.allowOverdraft,
	});

	return {
		success: true,
		isOverdraft: result.isOverdraft,
		completedItemsCount: result.deductions.length,
		deductions: result.deductions,
		warnings: result.warnings,
	};
}
