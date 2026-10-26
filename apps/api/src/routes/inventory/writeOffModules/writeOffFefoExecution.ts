/**
 * writeOffFefoExecution.ts — Layer 2 / Layer 3: FEFO-партионное списание (Мандат 8b, <= 110L).
 * Реализует Мандаты 8e, 8k, 8n (Doctor Autonomy, Zero Dead-Ends, Soft Overdraft).
 */

import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { inventoryItems } from "../../../db/schema.js";
import { fefoStockService } from "../../../services/inventory/fefoStockService.js";
import type { inventoryDeductItemSchema } from "../types.js";
import type { DatabaseTransaction } from "./writeOffTypes.js";

export { handleDeductRequest } from "./writeOffFefoParties.js";

export interface FefoBatchDeductionParams {
	organizationId: string;
	items: Array<z.infer<typeof inventoryDeductItemSchema>>;
	commonReason?: string | undefined;
	visitId?: string | undefined;
	allowOverdraftDefault?: boolean | undefined;
	effectiveUserId: string | null;
}

export async function executeFefoBatchDeduction(
	tx: DatabaseTransaction,
	params: FefoBatchDeductionParams,
): Promise<Array<any>> {
	const { organizationId, items, commonReason, visitId, allowOverdraftDefault = true, effectiveUserId } = params;
	const results: Array<any> = [];

	for (const item of items) {
		let itemId = item.inventoryItemId || item.id;

		if (!itemId && item.name?.trim()) {
			const searchName = item.name.trim();
			let [found] = await tx
				.select({ id: inventoryItems.id })
				.from(inventoryItems)
				.where(and(eq(inventoryItems.organizationId, organizationId), sql`lower(${inventoryItems.name}) = lower(${searchName})`))
				.limit(1);

			if (!found) {
				const [partial] = await tx
					.select({ id: inventoryItems.id })
					.from(inventoryItems)
					.where(and(eq(inventoryItems.organizationId, organizationId), sql`lower(${inventoryItems.name}) LIKE lower(${'%' + searchName + '%'})`))
					.limit(1);
				if (partial) found = partial;
			}

			if (found) {
				itemId = found.id;
			} else {
				const [created] = await tx
					.insert(inventoryItems)
					.values({ organizationId, name: searchName, stockQuantity: "0", currentQty: "0", criticalThreshold: "0", unitCostRub: item.unitCostRub != null ? String(item.unitCostRub) : "0" })
					.returning({ id: inventoryItems.id });
				if (created) itemId = created.id;
			}
		}

		if (!itemId) {
			throw new Error(`Не удалось определить позицию склада для «${item.name || "не указано"}»`);
		}

		const res = await fefoStockService.deductFefo(tx, {
			organizationId,
			inventoryItemId: itemId,
			requiredQty: item.quantity,
			allowOverdraft: item.allowOverdraft ?? allowOverdraftDefault,
			notes: item.reason || item.notes || commonReason || "Списание со склада у кресла (FEFO)",
			userId: effectiveUserId,
			visitId: visitId || null,
			transactionType: "treatment_consumable",
		});
		results.push(res);
	}

	return results;
}
