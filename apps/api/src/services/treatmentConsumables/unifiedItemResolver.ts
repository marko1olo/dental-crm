/**
 * unifiedItemResolver.ts — Layer 1: Resolves or auto-creates items on the fly (Zero Dead-Ends).
 */

import { rublesToKopecks } from "@dental/shared";
import { eq } from "drizzle-orm";
import { inventoryItems } from "../../db/schema.js";
import type { DbExecutor } from "./types.js";
import type { ResolvedItemTarget, UnifiedStockItemDefinition } from "./unifiedStockDeductionTypes.js";

export async function resolveOrAutoCreateItems(
	tx: DbExecutor,
	organizationId: string,
	definitions: UnifiedStockItemDefinition[],
): Promise<ResolvedItemTarget[]> {
	const allOrgItems = await tx
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	const resolved: ResolvedItemTarget[] = [];

	for (const def of definitions) {
		let matched = def.exactItemId
			? allOrgItems.find((i) => i.id === def.exactItemId)
			: undefined;

		const patterns = def.patterns;
		if (!matched && patterns && patterns.length > 0) {
			matched = allOrgItems.find((inv) =>
				patterns.some((p) => inv.name.toLowerCase().includes(p.toLowerCase())),
			);
		}

		if (!matched) {
			const costKop = BigInt(rublesToKopecks(Number(def.defaultCost ?? 0)));
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					organizationId,
					name: def.defaultName,
					category: def.category,
					unit: def.unit,
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "10",
					unitCostRub: def.defaultCost ?? "0",
					unitCostKopecks: costKop,
					pricePerUnitKopecks: costKop,
				})
				.returning();
			if (created) {
				matched = created;
				allOrgItems.push(created);
			}
		}

		if (matched) {
			resolved.push({ item: matched, qty: def.qty, label: def.label });
		}
	}

	return resolved;
}
