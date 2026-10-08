/**
 * manualDeduction.ts — Layer 2: Emergency manual item deductions with guaranteed soft overdraft.
 */

import {
	type StockDeductionRecord,
	type StockDeductionWarning,
	isDeductibleQuantity,
} from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import {
	inventoryItems,
	inventoryTransactions,
} from "../../db/schema.js";
import {
	type DbExecutor,
	InsufficientStockError,
} from "./types.js";

/**
 * Экстренное списание списка материалов со склада с гарантированным мягким овердрафтом.
 * Гарантирует:
 * 1. Отсутствие 409 Conflict и блокировки врача/медсестры.
 * 2. Deadlock-free блокировку строк inventoryItems (сортировка по ID).
 * 3. Фиксацию признака isOverdraft: true и типа транзакции "emergency_overdraft" при дефиците партии.
 * 4. Запись в журнал аудита без бюрократических комиссий.
 */
export async function deductManualItems(
	tx: DbExecutor,
	params: {
		organizationId: string;
		items: Array<{
			inventoryItemId: string;
			quantity: number;
			reason?: string | null | undefined;
		}>;
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
	const {
		organizationId,
		items,
		visitId = null,
		userId = null,
		notes = null,
		allowOverdraft = true,
	} = params;

	if (!items || items.length === 0) {
		return {
			success: true,
			isOverdraft: false,
			completedItemsCount: 0,
			deductions: [],
			warnings: [],
		};
	}

	// Агрегация количеств по ID
	const requiredByItem = new Map<string, number>();
	const reasonsByItem = new Map<string, string>();
	for (const it of items) {
		if (!it.inventoryItemId) continue;
		const qty = Number(it.quantity);
		if (!isDeductibleQuantity(qty)) continue;
		const current = requiredByItem.get(it.inventoryItemId) ?? 0;
		requiredByItem.set(it.inventoryItemId, current + qty);
		if (it.reason) {
			reasonsByItem.set(it.inventoryItemId, it.reason);
		}
	}

	const sortedIds = Array.from(requiredByItem.keys()).sort();
	if (sortedIds.length === 0) {
		return {
			success: true,
			isOverdraft: false,
			completedItemsCount: 0,
			deductions: [],
			warnings: [],
		};
	}

	// Блокировка строк FOR UPDATE (Deadlock-free)
	const lockedRows = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				inArray(inventoryItems.id, sortedIds),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	const itemMap = new Map(lockedRows.map((r) => [r.id, r]));
	const deductions: StockDeductionRecord[] = [];
	const warnings: StockDeductionWarning[] = [];
	const transactionsToInsert: Array<typeof inventoryTransactions.$inferInsert> = [];
	let hasAnyOverdraft = false;

	for (const itemId of sortedIds) {
		const requiredQty = requiredByItem.get(itemId);
		if (!requiredQty || requiredQty <= 0) continue;

		const inv = itemMap.get(itemId);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - requiredQty).toFixed(4));
		const isItemOverdraft = newStock < 0;

		if (isItemOverdraft) {
			hasAnyOverdraft = true;
			if (allowOverdraft === false) {
				throw new InsufficientStockError({
					inventoryItemId: inv.id,
					inventoryItemName: inv.name,
					availableStock: baseStock,
					requiredStock: requiredQty,
				});
			}

			warnings.push({
				type: "out_of_stock",
				itemId: inv.id,
				itemName: inv.name,
				message: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${inv.name}» (в наличии ${baseStock}, требовалось ${requiredQty}, остаток: ${newStock} ${inv.unit ?? "ед."}). Списано под экстренную операцию.`,
				currentStock: newStock,
				criticalThreshold: Number(inv.criticalThreshold ?? 0),
				expirationDate: inv.expirationDate,
			});
		} else if (newStock <= Number(inv.criticalThreshold ?? 0)) {
			warnings.push({
				type: newStock === 0 ? "out_of_stock" : "low_stock",
				itemId: inv.id,
				itemName: inv.name,
				message: newStock === 0
					? `Материал «${inv.name}» полностью израсходован на складе.`
					: `Остаток материала «${inv.name}» снизился до критического уровня (${newStock} ${inv.unit ?? "ед."}).`,
				currentStock: newStock,
				criticalThreshold: Number(inv.criticalThreshold ?? 0),
				expirationDate: inv.expirationDate,
			});
		}

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, inv.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		const reason = reasonsByItem.get(itemId) || notes;
		transactionsToInsert.push({
			organizationId,
			visitId,
			itemId: inv.id,
			inventoryItemId: inv.id,
			quantityChanged: String(-requiredQty),
			qty: String(-requiredQty),
			unitCostRub: inv.unitCostRub ?? "0",
			transactionType: isItemOverdraft ? "emergency_overdraft" : "manual_writeoff",
			isOverdraft: isItemOverdraft,
			userId,
			notes: isItemOverdraft
				? `Списано под операцию, требуется оприходование (экстренное списание: дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
				: (reason || "Экстренное списание материалов (мягкий овердрафт)"),
		});

		deductions.push({
			inventoryItemId: inv.id,
			inventoryItemName: inv.name,
			quantityChanged: String(-requiredQty),
			unitCostRub: inv.unitCostRub,
			lotNumber: inv.lotNumber,
			remainingStock: newStock,
		});
	}

	if (transactionsToInsert.length > 0) {
		await tx.insert(inventoryTransactions).values(transactionsToInsert);
	}

	return {
		success: true,
		isOverdraft: hasAnyOverdraft,
		completedItemsCount: deductions.length,
		deductions,
		warnings,
	};
}
