/**
 * softOverdraftDeduct.ts — Layer 2: Standalone soft overdraft item deduction for warehouse.
 */

import { formatInventoryUnitRu } from "@dental/shared";
import { and, eq, ilike, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.js";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import type { softOverdraftDeductSchema } from "./warehouseSchemas.js";

export async function executeSoftOverdraftDeduct(
	organizationId: string,
	data: z.infer<typeof softOverdraftDeductSchema>,
	userId: string | null,
) {
	const rawId = data.itemId || data.inventoryItemId;
	const searchName = (data.name || data.itemName || "").trim();

	return await db.transaction(async (tx) => {
		let item: typeof inventoryItems.$inferSelect | undefined;

		if (rawId) {
			const [itemById] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, rawId), eq(inventoryItems.organizationId, organizationId)))
				.limit(1)
				.for("update");
			item = itemById;
		}

		if (!item && searchName) {
			const [itemByName] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.organizationId, organizationId), sql`lower(${inventoryItems.name}) = lower(${searchName})`))
				.orderBy(inventoryItems.id)
				.limit(1)
				.for("update");
			item = itemByName;
		}

		if (!item && searchName) {
			const [partial] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.organizationId, organizationId), ilike(inventoryItems.name, `%${searchName}%`)))
				.orderBy(inventoryItems.id)
				.limit(1)
				.for("update");
			item = partial;
		}

		if (!item) {
			const targetName = searchName || (rawId ? `Материал ${rawId}` : "Клинический расходник");
			const isUuid = rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					...(isUuid ? { id: rawId } : {}),
					organizationId,
					name: targetName,
					unit: formatInventoryUnitRu("pcs"),
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "0",
					unitCostRub: "0",
				})
				.returning();
			item = created;
		}

		if (!item) throw new Error("Не удалось инициализировать карточку материала для списания");

		const currentStock = Number(item.stockQuantity ?? item.currentQty ?? 0);
		const newStock = Number((currentStock - data.quantity).toFixed(4));
		const isOverdraft = newStock < 0;
		const deficit = isOverdraft ? Math.abs(newStock) : 0;

		await tx
			.update(inventoryItems)
			.set({ stockQuantity: String(newStock), currentQty: String(newStock), updatedAt: new Date() })
			.where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.organizationId, organizationId)));

		const [txRecord] = await tx
			.insert(inventoryTransactions)
			.values({
				organizationId,
				itemId: item.id,
				inventoryItemId: item.id,
				visitId: data.visitId || null,
				transactionType: isOverdraft ? "emergency_overdraft" : "consumption",
				qty: String(-data.quantity),
				quantityChanged: String(-data.quantity),
				isOverdraft,
				notes:
					data.reason ??
					(isOverdraft
						? `Мягкий овердрафт: экстренное списание при нулевом/недостаточном остатке (дефицит: ${deficit})`
						: "Списание расходных материалов"),
				userId,
				createdAt: new Date(),
			})
			.returning();

		return { item, currentStock, newStock, isOverdraft, deficit, transaction: txRecord };
	});
}
