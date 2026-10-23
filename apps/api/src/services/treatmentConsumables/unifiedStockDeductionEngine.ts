/**
 * unifiedStockDeductionEngine.ts — Layer 2: SSOT Stock Deduction Engine with Soft Negative Stock.
 * Complies with Mandates 8e, 8n (Solo Doctor & Small Clinic), and 8aa (Zero Blocking Alarms).
 */

import { and, eq, inArray } from "drizzle-orm";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import type { DbExecutor } from "./types.js";
import { resolveOrAutoCreateItems } from "./unifiedItemResolver.js";
import type {
	UnifiedDeductedItemRecord,
	UnifiedStockDeductionParams,
	UnifiedStockDeductionResult,
} from "./unifiedStockDeductionTypes.js";

export async function executeUnifiedStockDeduction(
	tx: DbExecutor,
	params: UnifiedStockDeductionParams,
): Promise<UnifiedStockDeductionResult> {
	const {
		organizationId,
		items,
		transactionType,
		visitId = null,
		userId = null,
		notes = null,
		reasonPrefix = "Списание со склада",
		successMessageTemplate,
	} = params;

	const resolved = await resolveOrAutoCreateItems(tx, organizationId, items);
	if (resolved.length === 0) {
		return { success: true, isOverdraft: false, deductedItems: [], warnings: [], message: "Нет позиций для списания." };
	}

	const sortedIds = resolved.map((r) => r.item.id).sort();
	const lockedRows = await tx
		.select()
		.from(inventoryItems)
		.where(and(inArray(inventoryItems.id, sortedIds), eq(inventoryItems.organizationId, organizationId)))
		.for("update");

	const lockedMap = new Map(lockedRows.map((r) => [r.id, r]));
	const deductedItems: UnifiedDeductedItemRecord[] = [];
	const warnings: string[] = [];
	const txRows: Array<typeof inventoryTransactions.$inferInsert> = [];
	let hasOverdraft = false;

	for (const target of resolved) {
		const inv = lockedMap.get(target.item.id);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - target.qty).toFixed(4));
		const isOverdraft = newStock < 0;
		if (isOverdraft) hasOverdraft = true;

		await tx
			.update(inventoryItems)
			.set({ stockQuantity: String(newStock), currentQty: String(newStock), updatedAt: new Date() })
			.where(and(eq(inventoryItems.id, inv.id), eq(inventoryItems.organizationId, organizationId)));

		const itemLabel = target.label || inv.name;
		const txNote = isOverdraft
			? `Списано под операцию, требуется оприходование (${itemLabel}: дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
			: (notes || `${reasonPrefix} (${itemLabel})`);

		txRows.push({
			organizationId,
			visitId,
			itemId: inv.id,
			inventoryItemId: inv.id,
			quantityChanged: String(-target.qty),
			qty: String(-target.qty),
			unitCostRub: inv.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : transactionType,
			isOverdraft,
			userId,
			notes: txNote,
		});

		if (isOverdraft) {
			warnings.push(`Позиция «${inv.name}»: списано под операцию, требуется оприходование (остаток: ${newStock} ${inv.unit ?? "ед."}).`);
		}

		deductedItems.push({
			itemId: inv.id,
			itemName: inv.name,
			quantity: target.qty,
			unit: inv.unit ?? "шт.",
			remainingStock: newStock,
			isOverdraft,
		});
	}

	if (txRows.length > 0) {
		await tx.insert(inventoryTransactions).values(txRows);
	}

	const message = successMessageTemplate
		? successMessageTemplate(deductedItems.length, hasOverdraft)
		: `Списано ${deductedItems.length} позиций${hasOverdraft ? " с мягким овердрафтом (без блокировки врача)" : ""}.`;

	return {
		success: true,
		isOverdraft: hasOverdraft,
		...(hasOverdraft ? { warning: "soft_overdraft" } : {}),
		deductedItems,
		warnings,
		message,
	};
}
