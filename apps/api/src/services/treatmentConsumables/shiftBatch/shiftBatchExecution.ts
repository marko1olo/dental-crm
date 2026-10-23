/**
 * shiftBatchExecution.ts — Layer 3: 1-click execution of shift batch consumables deduction.
 */

import { sql } from "drizzle-orm";
import type { DbExecutor } from "../types.js";
import { executeUnifiedStockDeduction } from "../unifiedStockDeductionEngine.js";
import { getShiftConsumablesSummary } from "./shiftSummaryQueries.js";
import type { ExecuteShiftBatchDeductionParams, ExecuteShiftBatchDeductionResult } from "./shiftBatchTypes.js";

export async function executeShiftBatchDeduction(
	tx: DbExecutor,
	params: ExecuteShiftBatchDeductionParams,
): Promise<ExecuteShiftBatchDeductionResult> {
	const { organizationId, date, userId, items, notes } = params;
	const now = new Date();
	const effectiveDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : now.toISOString().slice(0, 10);

	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':shift_deduct:' || ${effectiveDate}))`,
	);

	let targets = items ?? [];
	if (targets.length === 0) {
		const summary = await getShiftConsumablesSummary(tx, organizationId, effectiveDate);
		targets = summary.consumablesSummary.map((c) => ({
			itemId: c.itemId,
			qty: c.qtyToDeduct,
			name: c.itemName,
		}));
	}

	if (targets.length === 0) {
		return { success: true, isOverdraft: false, date: effectiveDate, deductedItems: [], warnings: [], message: "Нет позиций для списания." };
	}

	const unifiedItems = targets.map((t) => ({
		exactItemId: t.itemId,
		defaultName: t.name || `Материал ${t.itemId}`,
		category: "Расходные материалы",
		unit: "шт.",
		qty: t.qty,
	}));

	const res = await executeUnifiedStockDeduction(tx, {
		organizationId,
		items: unifiedItems,
		transactionType: "shift_batch_deduction",
		userId,
		notes: notes || `Пакетное списание расходников за смену ${effectiveDate} (1 клик, Мандат 8n)`,
		reasonPrefix: `Списание под смену ${effectiveDate}`,
		successMessageTemplate: (count, hasOverdraft) =>
			`Расходники за смену ${effectiveDate} списаны пакетом в 1 клик (${count} поз., мягкий овердрафт: ${hasOverdraft ? "активен" : "нет"}).`,
	});

	return {
		success: res.success,
		isOverdraft: res.isOverdraft,
		date: effectiveDate,
		deductedItems: res.deductedItems,
		warnings: res.warnings,
		message: res.message,
	};
}
