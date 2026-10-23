/**
 * quickCarpuleDisposal.ts — Layer 2: 1-click disposal of empty anesthetic carpules (SanPiN 3.3686-21).
 */

import { randomInt } from "node:crypto";
import { and, eq, ilike, or } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.js";
import { inventoryItems } from "../../db/schema.js";
import { FefoStockService } from "../inventory/fefoStockService.js";
import type { quickCarpuleDisposalSchema } from "./warehouseSchemas.js";

const fefoStockService = new FefoStockService();

export async function executeQuickCarpuleDisposal(
	organizationId: string,
	data: z.infer<typeof quickCarpuleDisposalSchema>,
	userId: string | null,
) {
	const now = new Date();
	const dateIso = now.toISOString().slice(0, 10);
	const actNumber = `АКТ-КП-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${randomInt(100, 1000)}`;

	const result = await db.transaction(async (tx) => {
		let matchingItem: typeof inventoryItems.$inferSelect | undefined;

		if (data.anestheticItemId) {
			const [itemById] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, data.anestheticItemId), eq(inventoryItems.organizationId, organizationId)))
				.limit(1)
				.for("update");
			matchingItem = itemById;
		}

		if (!matchingItem) {
			const [itemByName] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						or(
							ilike(inventoryItems.name, `%${data.drugName}%`),
							ilike(inventoryItems.name, "%артикаин%"),
							ilike(inventoryItems.name, "%ультракаин%"),
							ilike(inventoryItems.name, "%анесте%"),
							eq(inventoryItems.category, "anesthesia"),
						),
					),
				)
				.orderBy(inventoryItems.id)
				.limit(1)
				.for("update");
			matchingItem = itemByName;
		}

		let isOverdraft = false;
		let remainingStock = 0;
		let deficitCount = 0;

		if (matchingItem) {
			const fefoResult = await fefoStockService.deductFefo(tx, {
				organizationId,
				inventoryItemId: matchingItem.id,
				requiredQty: data.carpulesCount,
				visitId: data.visitId ?? null,
				userId,
				allowOverdraft: true,
				transactionType: "treatment_consumable",
				notes: `Списание пустых карпул в 1 клик (${data.carpulesCount} шт.) • ${data.nurseName} [СанПиН 3.3686-21]`,
			});

			const currentStock = Number(matchingItem.stockQuantity ?? matchingItem.currentQty ?? 0);
			isOverdraft = fefoResult.isOverdraft;
			remainingStock = Number((currentStock - data.carpulesCount).toFixed(3));
			deficitCount = fefoResult.deficitQty;
		} else {
			isOverdraft = true;
			deficitCount = data.carpulesCount;
			remainingStock = -data.carpulesCount;
		}

		return { isOverdraft, remainingStock, deficitCount, drugName: matchingItem?.name ?? data.drugName };
	});

	return {
		success: true,
		actNumber,
		date: dateIso,
		drugName: result.drugName,
		carpulesCount: data.carpulesCount,
		nurseName: data.nurseName,
		doctorName: data.doctorName,
		singleSigner: true,
		sanpinClause: "СанПиН 3.3686-21 п. 3630",
		wasteClass: "class_b_hazardous",
		isOverdraft: result.isOverdraft,
		remainingStock: result.remainingStock,
		deficitCount: result.deficitCount,
		warning: result.isOverdraft ? "soft_overdraft" : undefined,
		warningMessage: result.isOverdraft
			? `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${result.deficitCount} карп., накладная поставщика ещё не внесена). Операция спасения зуба не заблокирована.`
			: undefined,
	};
}
