/**
 * stockDeductionOverdraftHandler.ts — Layer 2: Soft overdraft, stock warnings & FEFO deduction loop.
 * Decomposed in accordance with Mandate 8b (<= 120 lines).
 */

import type { DbExecutor } from "../types.js";
import { buildToothDeductionNote, buildVisitDeductionNote } from "./stockDeductionNotes.js";
import { executeFefoDeductionStep } from "./stockDeductionStepExecutor.js";
import type {
	ResolvedItemEntry,
	StockDeductionRecord,
	StockDeductionWarning,
} from "./stockDeductionTypes.js";

export { buildToothDeductionNote, buildVisitDeductionNote, executeFefoDeductionStep };

export async function executeFefoDeductionLoop(
	tx: DbExecutor,
	params: {
		resolvedEntries: ResolvedItemEntry[];
		organizationId: string;
		safeVisitId?: string | null | undefined;
		userId?: string | null | undefined;
		transactionType: "auto_deduct" | "manual_writeoff";
		allowOverdraft?: boolean | undefined;
		noteText: (newStock: number, unit: string) => string;
	},
): Promise<{
	deductions: StockDeductionRecord[];
	warnings: StockDeductionWarning[];
	isOverdraft: boolean;
}> {
	const deductions: StockDeductionRecord[] = [];
	const warnings: StockDeductionWarning[] = [];
	let isOverdraft = false;

	for (const entry of params.resolvedEntries) {
		const stepRes = await executeFefoDeductionStep(tx, {
			entry,
			organizationId: params.organizationId,
			safeVisitId: params.safeVisitId,
			userId: params.userId,
			transactionType: params.transactionType,
			allowOverdraft: params.allowOverdraft ?? true,
			noteText: params.noteText,
		});

		if (stepRes.deduction) {
			deductions.push(stepRes.deduction);
		}
		if (stepRes.warnings.length > 0) {
			warnings.push(...stepRes.warnings);
		}
		if (stepRes.isOverdraft) {
			isOverdraft = true;
		}
	}

	return { deductions, warnings, isOverdraft };
}
