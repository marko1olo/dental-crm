/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/sterilizationConsumablesDeduction.ts
 *
 * Фоновое списание крафт-пакетов и индикаторов 5-6 класса со склада (Soft Negative Stock).
 * Мандат 8b: строго <= 120 строк.
 */

import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { inventoryItems, inventoryTransactions } from "../../../../db/schema.js";
import {
	type SterilizationDeductionParams,
	type SterilizationDeductionResult,
	resolveConsumablesToDeduct,
} from "./sterilizationConsumablesTypes.js";

export { type SterilizationDeductionParams, type SterilizationDeductionResult };

export async function executeSterilizationConsumablesDeduction(
	params: SterilizationDeductionParams,
): Promise<SterilizationDeductionResult> {
	const count = Math.max(1, params.count ?? 1);
	const orgId = params.organizationId;
	const itemsToDeduct = resolveConsumablesToDeduct(count, params.packagingType, params.indicatorType);
	const deductedSummary: Array<{
		itemName: string;
		quantityDeducted: number;
		isOverdraft: boolean;
		remainingStock: number;
	}> = [];

	try {
		await db.transaction(async (tx) => {
			for (const spec of itemsToDeduct) {
				const [existing] = await tx
					.select()
					.from(inventoryItems)
					.where(and(eq(inventoryItems.organizationId, orgId), or(eq(inventoryItems.name, spec.name), ilike(inventoryItems.name, `%${spec.name.slice(0, 15)}%`))))
					.limit(1)
					.for("update");

				let item = existing;
				if (!item) {
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
							notes: "Авто-создано системой учета стерилизации",
						})
						.returning();
					item = created;
				}
				if (!item) continue;

				const currentStock = Number(item.currentQty || item.stockQuantity || 0);
				const nextStock = currentStock - spec.qty;
				const isOverdraft = nextStock < 0;

				await tx
					.update(inventoryItems)
					.set({ currentQty: String(nextStock), stockQuantity: String(nextStock), updatedAt: new Date() })
					.where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.organizationId, orgId)));

				const note = `[Журнал автоклавирования] Списание расходников цикла автоклава${params.cycleNumber ? ` №${params.cycleNumber}` : ""}${params.barcode ? ` (${params.barcode})` : ""}`;

				await tx.insert(inventoryTransactions).values({
					organizationId: orgId,
					itemId: item.id,
					inventoryItemId: item.id,
					transactionType: isOverdraft ? "emergency_overdraft" : "auto_deduct",
					qty: String(spec.qty),
					quantityChanged: String(-spec.qty),
					isOverdraft,
					userId: params.userId ?? null,
					notes: note,
				});

				deductedSummary.push({ itemName: item.name, quantityDeducted: spec.qty, isOverdraft, remainingStock: nextStock });
			}
		});

		return { success: true, deductedItems: deductedSummary };
	} catch (err) {
		console.warn("[SanPiN Sterilization Stock Deduction] Soft fallback on stock deduction error:", err);
		return { success: false, deductedItems: [] };
	}
}
