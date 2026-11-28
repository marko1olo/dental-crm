/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/sterilizationConsumablesDeduction.ts
 *
 * Фоновое списание крафт-пакетов и индикаторов 5-6 класса со склада (Soft Negative Stock).
 * Мандат 8b: строго <= 120 строк.
 */

import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { withSavepoint, withTenantWriteCtx, type TenantDb } from "../../../../db/rls.js";
import { inventoryItems, inventoryTransactions, stockBatches } from "../../../../db/schema.js";
import { type SterilizationDeductionParams, type SterilizationDeductionResult, resolveConsumablesToDeduct } from "./sterilizationConsumablesTypes.js";

export { type SterilizationDeductionParams, type SterilizationDeductionResult };

export async function executeSterilizationConsumablesDeduction(
	params: SterilizationDeductionParams,
	externalTx?: TenantDb,
): Promise<SterilizationDeductionResult> {
	const count = Math.max(1, params.count ?? 1);
	const orgId = params.organizationId;
	const itemsToDeduct = [...resolveConsumablesToDeduct(count, params.packagingType, params.indicatorType)].sort((a, b) =>
		a.name.localeCompare(b.name),
	);
	const deductedSummary: Array<{
		itemName: string;
		quantityDeducted: number;
		isOverdraft: boolean;
		remainingStock: number;
	}> = [];

	const runDeduction = async (tx: TenantDb) => {
		if (itemsToDeduct.length === 0) return;

		// 1. Детерминированное пакетное разрешение ID (без FOR UPDATE до сортировки) и единая блокировка по ORDER BY id ASC (anti-40P01)
		const matchConditions = itemsToDeduct.map((spec) =>
			or(eq(inventoryItems.name, spec.name), ilike(inventoryItems.name, `%${spec.name.slice(0, 15)}%`)),
		);
		const candidateRows = await tx
			.select({ id: inventoryItems.id, name: inventoryItems.name })
			.from(inventoryItems)
			.where(and(eq(inventoryItems.organizationId, orgId), or(...matchConditions)))
			.orderBy(asc(inventoryItems.id));

		const matchedIdBySpecName = new Map<string, string>();
		for (const spec of itemsToDeduct) {
			const lowerName = spec.name.toLowerCase();
			const prefix = spec.name.slice(0, 15).toLowerCase();
			const exact = candidateRows.find((r) => r.name.toLowerCase() === lowerName);
			const partial = exact ?? candidateRows.find((r) => r.name.toLowerCase().includes(prefix));
			if (partial) {
				matchedIdBySpecName.set(spec.name, partial.id);
			}
		}

		// Создаём отсутствующие позиции в детерминированном порядке до пакетной блокировки
		for (const spec of itemsToDeduct) {
			if (matchedIdBySpecName.has(spec.name)) continue;
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					organizationId: orgId,
					name: spec.name,
					category: spec.category,
					unit: spec.unit,
					currentQty: "0",
					stockQuantity: "0",
					minQty: "20",
					criticalThreshold: "20",
					unitCostRub: "0",
					unitCostKopecks: 0n,
					pricePerUnitKopecks: 0n,
					notes: "Авто-создано системой учета стерилизации",
				})
				.returning({ id: inventoryItems.id });
			if (created) {
				matchedIdBySpecName.set(spec.name, created.id);
			}
		}

		const sortedItemIds = Array.from(new Set(matchedIdBySpecName.values())).sort();
		if (sortedItemIds.length === 0) return;

		const lockedItems = await tx
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.organizationId, orgId), inArray(inventoryItems.id, sortedItemIds)))
			.orderBy(asc(inventoryItems.id))
			.for("update");
		const lockedById = new Map(lockedItems.map((row) => [row.id, row]));

		const activeBatches = await tx
			.select()
			.from(stockBatches)
			.where(and(eq(stockBatches.organizationId, orgId), inArray(stockBatches.inventoryItemId, sortedItemIds), eq(stockBatches.status, "active")))
			.orderBy(asc(stockBatches.expirationDate), asc(stockBatches.id))
			.for("update");
		const batchesByItemId = new Map<string, Array<typeof stockBatches.$inferSelect>>();
		for (const b of activeBatches) {
			const list = batchesByItemId.get(b.inventoryItemId) ?? [];
			list.push(b);
			batchesByItemId.set(b.inventoryItemId, list);
		}

		const note = `[Журнал автоклавирования] Списание расходников цикла автоклава${params.cycleNumber ? ` №${params.cycleNumber}` : ""}${params.barcode ? ` (${params.barcode})` : ""}`;

		for (const spec of itemsToDeduct) {
			const itemId = matchedIdBySpecName.get(spec.name);
			const item = itemId ? lockedById.get(itemId) : undefined;
			if (!item) continue;

			const currentStock = Number(item.currentQty || item.stockQuantity || 0);
			const nextStock = currentStock - spec.qty;
			const isOverdraft = nextStock < 0;

			const [updatedItem] = await tx
				.update(inventoryItems)
				.set({ currentQty: String(nextStock), stockQuantity: String(nextStock), updatedAt: new Date() })
				.where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.organizationId, orgId)))
				.returning();
			if (updatedItem) {
				lockedById.set(item.id, updatedItem);
			}

			await tx.insert(inventoryTransactions).values({
				organizationId: orgId,
				itemId: item.id,
				inventoryItemId: item.id,
				transactionType: isOverdraft ? "emergency_overdraft" : "auto_deduct",
				qty: String(spec.qty),
				quantityChanged: String(-spec.qty),
				unitCostRub: item.unitCostRub ?? "0",
				unitCostKopecks: item.unitCostKopecks ?? 0n,
				isOverdraft,
				userId: params.userId ?? null,
				notes: note,
			});

			// Пакетное списание из активных партий stock_batches (уже заблокированы в FEFO порядке)
			let remainingToDeduct = spec.qty;
			for (const batch of batchesByItemId.get(item.id) ?? []) {
				if (remainingToDeduct <= 0) break;
				const batchRemaining = Number(batch.remainingQty || 0);
				if (batchRemaining <= 0) continue;
				const take = Math.min(batchRemaining, remainingToDeduct);
				const rem = Math.max(0, batchRemaining - take);
				batch.remainingQty = String(rem);
				batch.status = rem <= 0 ? "depleted" : "active";
				remainingToDeduct -= take;
				await tx
					.update(stockBatches)
					.set({ remainingQty: String(rem), status: batch.status, updatedAt: new Date() })
					.where(and(eq(stockBatches.id, batch.id), eq(stockBatches.organizationId, orgId)));
			}

			deductedSummary.push({ itemName: item.name, quantityDeducted: spec.qty, isOverdraft, remainingStock: nextStock });
		}
	};

	try {
		if (externalTx) {
			await withSavepoint(externalTx, async (nestedTx) => {
				await runDeduction(nestedTx);
			});
		} else {
			await withTenantWriteCtx(orgId, runDeduction);
		}

		return { success: true, deductedItems: deductedSummary };
	} catch (err) {
		const log = params.logger ?? params.log;
		log?.warn(
			{ err, orgId: params.organizationId, cycleNumber: params.cycleNumber },
			"[SanPiN Sterilization Stock Deduction] Soft fallback on stock deduction error",
		);
		return { success: false, deductedItems: [] };
	}
}
