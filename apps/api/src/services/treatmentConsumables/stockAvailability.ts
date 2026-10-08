/**
 * stockAvailability.ts — Layer 2: Pre-flight stock availability check for upcoming treatments.
 */

import {
	type RequiredMaterialItem,
	type StockAvailabilityCheckResponse,
} from "@dental/shared";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
	inventoryItems,
	procedureMaterialRules,
} from "../../db/schema.js";
import type { DbExecutor } from "./types.js";

/**
 * Pre-flight stock availability check for upcoming treatments.
 */
export async function checkStockSufficiency(
	executor: DbExecutor,
	organizationId: string,
	services: Array<{ serviceId: string; quantity: number }>,
): Promise<StockAvailabilityCheckResponse> {
	const serviceIds = services.map((s) => s.serviceId).filter(Boolean);
	if (serviceIds.length === 0) {
		return { sufficient: true, requiredMaterials: [], warnings: [] };
	}

	const rules = await executor
		.select()
		.from(procedureMaterialRules)
		.where(
			and(
				inArray(procedureMaterialRules.serviceId, serviceIds),
				or(
					eq(procedureMaterialRules.organizationId, organizationId),
					isNull(procedureMaterialRules.organizationId),
				),
			),
		);

	const requiredByItem = new Map<string, number>();
	for (const s of services) {
		const matching = rules.filter((r) => r.serviceId === s.serviceId);
		for (const r of matching) {
			const itemId = r.inventoryItemId ?? r.materialItemId;
			if (!itemId) continue;
			const qtyPerUnit = Number(r.quantityToDeduct ?? r.requiredQty ?? 1);
			const totalNeeded = qtyPerUnit * s.quantity;
			const cur = requiredByItem.get(itemId) ?? 0;
			requiredByItem.set(itemId, cur + totalNeeded);
		}
	}

	const itemIds = Array.from(requiredByItem.keys());
	if (itemIds.length === 0) {
		return { sufficient: true, requiredMaterials: [], warnings: [] };
	}

	const items = await executor
		.select()
		.from(inventoryItems)
		.where(
			and(
				inArray(inventoryItems.id, itemIds),
				eq(inventoryItems.organizationId, organizationId),
			),
		);

	const itemMap = new Map(items.map((it) => [it.id, it]));
	const requiredMaterials: RequiredMaterialItem[] = [];
	const warnings: string[] = [];
	let allSufficient = true;

	for (const itemId of itemIds) {
		const requiredQty = requiredByItem.get(itemId) ?? 0;
		const inv = itemMap.get(itemId);
		const availableQty = Number(inv?.stockQuantity ?? inv?.currentQty ?? 0);
		const isSufficient = availableQty >= requiredQty;
		const deficit = isSufficient ? 0 : Number((requiredQty - availableQty).toFixed(4));

		if (!isSufficient) {
			allSufficient = false;
			warnings.push(
				`Внимание: дефицит материала «${inv?.name ?? itemId}»: требуется ${requiredQty}, в наличии ${availableQty} (дефицит: ${deficit} ${inv?.unit ?? "шт"}). Списано под операцию, требуется оприходование (мягкий овердрафт разрешён).`,
			);
		}

		requiredMaterials.push({
			inventoryItemId: itemId,
			itemName: inv?.name ?? "Неизвестный материал",
			requiredQty,
			availableQty,
			isSufficient,
			deficit,
			unit: inv?.unit,
			unitCostRub: Number(inv?.unitCostRub ?? 0),
		});
	}

	return {
		sufficient: allSufficient,
		requiredMaterials,
		warnings,
	};
}
