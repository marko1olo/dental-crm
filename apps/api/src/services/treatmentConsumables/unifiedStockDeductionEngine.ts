/**
 * unifiedStockDeductionEngine.ts — Layer 2: SSOT Stock Deduction Engine with Soft Negative Stock.
 * Complies with Mandates 8e, 8n (Solo Doctor & Small Clinic), and 8aa (Zero Blocking Alarms).
 */

import { and, eq, inArray } from "drizzle-orm";
import { inventoryItems } from "../../db/schema.js";
import { fefoStockService } from "../inventory/fefoStockService.js";
import type { DbTransaction } from "../inventory/fefo/types.js";
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
		metadata,
		idempotencyKey,
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
	let hasOverdraft = false;

	for (const target of resolved) {
		const inv = lockedMap.get(target.item.id);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const deductQty = Number(target.qty);
		const safeDeductQty = Number.isFinite(deductQty) && deductQty > 0 ? deductQty : 1;
		const itemLabel = target.label || inv.name;
		const idemTag = idempotencyKey ? ` [idempotencyKey:${idempotencyKey}]` : "";
		const txNote = notes
			? `${notes}${idemTag}`
			: `${reasonPrefix} (${itemLabel})${idemTag}`;

		const fefoRes = await fefoStockService.deductFefo(tx as DbTransaction, {
			organizationId,
			inventoryItemId: inv.id,
			requiredQty: safeDeductQty,
			visitId,
			userId,
			allowOverdraft: true,
			transactionType: transactionType === "manual_writeoff" ? "manual_writeoff" : "treatment_consumable",
			notes: txNote,
		});

		const remainingStock = Number((baseStock - safeDeductQty).toFixed(4));
		const isOverdraft = fefoRes.isOverdraft || Boolean(fefoRes.isNegativeStock);
		if (isOverdraft) {
			hasOverdraft = true;
			warnings.push(
				fefoRes.warning ||
					`Позиция «${inv.name}»: списано под операцию, требуется оприходование (остаток: ${remainingStock} ${inv.unit ?? "ед."}).`,
			);
		}

		deductedItems.push({
			itemId: inv.id,
			itemName: inv.name,
			quantity: target.qty,
			unit: inv.unit ?? "шт.",
			remainingStock,
			isOverdraft,
		});
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
