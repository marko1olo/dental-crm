import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import type { OrthoMaterialDeductionResult } from "./types.js";

export interface DeductOrthoMaterialParams {
	organizationId: string; patientId: string; itemNamePattern: string; defaultItemName: string;
	category: string; quantity: number; unit: string; notes: string;
	unitCostRub?: number | undefined; visitId?: string | null | undefined; userId?: string | null | undefined;
}

export async function deductOrthoMaterialSafely(params: DeductOrthoMaterialParams): Promise<OrthoMaterialDeductionResult> {
	const { organizationId, patientId, itemNamePattern, defaultItemName, category, quantity, unit, notes, unitCostRub = 1200, visitId = null, userId = null } = params;
	try {
		return await db.transaction(async (tx) => {
			const found = await tx.select().from(inventoryItems).where(and(
				eq(inventoryItems.organizationId, organizationId),
				or(ilike(inventoryItems.name, `%${itemNamePattern}%`), ilike(inventoryItems.name, `%${defaultItemName}%`)),
			)).orderBy(inventoryItems.id).limit(1).for("update");
			let targetItem = found[0];
			if (!targetItem) {
				const [created] = await tx.insert(inventoryItems).values({
					organizationId, name: defaultItemName, category, unit, unitCostRub: String(unitCostRub),
					stockQuantity: "0", currentQty: "0", criticalThreshold: "5",
				}).returning();
				targetItem = created;
			}
			if (!targetItem) return { success: false, isOverdraft: false, deductedQty: 0 };

			const currentStock = Number(targetItem.stockQuantity ?? targetItem.currentQty ?? 0);
			const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
			const newStock = Number((baseStock - quantity).toFixed(4));
			const isOverdraft = newStock < 0;

			await tx.update(inventoryItems).set({
				stockQuantity: String(newStock), currentQty: String(newStock), updatedAt: new Date(),
			}).where(and(eq(inventoryItems.id, targetItem.id), eq(inventoryItems.organizationId, organizationId)));

			await tx.insert(inventoryTransactions).values({
				organizationId, visitId, userId, itemId: targetItem.id, inventoryItemId: targetItem.id,
				quantityChanged: String(-quantity), qty: String(-quantity), unitCostRub: targetItem.unitCostRub ?? String(unitCostRub),
				transactionType: isOverdraft ? "emergency_overdraft" : "auto_deduct", isOverdraft,
				notes: isOverdraft ? `Списано под ортодонтический прием (мягкий овердрафт): пациент ${patientId}, остаток ${newStock} ${targetItem.unit}` : `${notes} (пациент ${patientId})`,
			});

			return { success: true, itemId: targetItem.id, itemName: targetItem.name, deductedQty: quantity, remainingStock: newStock, isOverdraft };
		});
	} catch (err) {
		console.warn("[Orthodontics] Soft overdraft deduction failed gracefully:", err);
		return { success: false, isOverdraft: false, deductedQty: 0, error: String(err) };
	}
}
