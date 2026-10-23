/**
 * stockDeductionIdempotency.ts — Idempotency guards against duplicate stock deductions on network retry.
 */

import { and, eq, inArray, like } from "drizzle-orm";
import { inventoryTransactions } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import type { StockDeductionResult } from "./stockDeductionTypes.js";

function makeIdempotentResult(txRows: Array<typeof inventoryTransactions.$inferSelect>, message: string): StockDeductionResult {
	return {
		completedTreatmentItems: 0,
		deductions: txRows.map((txRow) => ({
			inventoryItemId: txRow.itemId ?? txRow.inventoryItemId ?? "unknown",
			inventoryItemName: "Ранее списанный материал",
			quantityChanged: String(txRow.quantityChanged ?? txRow.qty ?? "0"),
			unitCostRub: txRow.unitCostRub,
			lotNumber: null,
			remainingStock: 0,
		})),
		warnings: [{
			type: "low_stock",
			itemId: txRows[0]?.itemId ?? "idempotent",
			itemName: "Списание расходников",
			message,
			currentStock: 0,
			criticalThreshold: 0,
		}],
		isOverdraft: false,
	};
}

export async function checkIdempotentVisitDeduction(
	tx: DbExecutor,
	organizationId: string,
	safeVisitId: string,
	clientMutationId: string | null | undefined,
	transactionType: "auto_deduct" | "manual_writeoff",
): Promise<StockDeductionResult | null> {
	if (clientMutationId) {
		const rows = await tx.select().from(inventoryTransactions).where(
			and(
				eq(inventoryTransactions.organizationId, organizationId),
				eq(inventoryTransactions.visitId, safeVisitId),
				like(inventoryTransactions.notes, `%[mutation:${clientMutationId}]%`),
			),
		);
		if (rows.length > 0) {
			return makeIdempotentResult(rows, `Повторный запрос списания материалов (ключ ${clientMutationId}). Операция дедуплицирована.`);
		}
	}

	if (transactionType === "auto_deduct") {
		const rows = await tx.select().from(inventoryTransactions).where(
			and(
				eq(inventoryTransactions.organizationId, organizationId),
				eq(inventoryTransactions.visitId, safeVisitId),
				inArray(inventoryTransactions.transactionType, ["auto_deduct", "emergency_overdraft"]),
			),
		);
		if (rows.length > 0) {
			return makeIdempotentResult(rows, `Расходники по визиту ${safeVisitId} уже были автоматически списаны ранее. Повторное списание предотвращено (защита от дублирования).`);
		}
	}

	return null;
}

export async function checkIdempotentToothDeduction(
	tx: DbExecutor,
	organizationId: string,
	treatmentItemId: string,
	clientMutationId: string | null | undefined,
	transactionType: "auto_deduct" | "manual_writeoff",
): Promise<StockDeductionResult | null> {
	if (clientMutationId) {
		const rows = await tx.select().from(inventoryTransactions).where(
			and(
				eq(inventoryTransactions.organizationId, organizationId),
				like(inventoryTransactions.notes, `%[mutation:${clientMutationId}]%`),
			),
		);
		if (rows.length > 0) {
			return makeIdempotentResult(rows, `Повторный запрос списания материалов по позиции лечения (ключ ${clientMutationId}). Операция дедуплицирована.`);
		}
	}

	if (transactionType === "auto_deduct") {
		const rows = await tx.select().from(inventoryTransactions).where(
			and(
				eq(inventoryTransactions.organizationId, organizationId),
				like(inventoryTransactions.notes, `%[treatmentItemId:${treatmentItemId}]%`),
				inArray(inventoryTransactions.transactionType, ["auto_deduct", "emergency_overdraft"]),
			),
		);
		if (rows.length > 0) {
			return makeIdempotentResult(rows, `Материалы по позиции лечения ${treatmentItemId} уже были автоматически списаны ранее. Повторное списание предотвращено (защита от дублирования).`);
		}
	}

	return null;
}
