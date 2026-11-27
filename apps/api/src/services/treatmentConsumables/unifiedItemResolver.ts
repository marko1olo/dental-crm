/**
 * unifiedItemResolver.ts — Layer 1: Resolves or auto-creates items on the fly (Zero Dead-Ends).
 */

import { rublesToKopecks } from "@dental/shared";
import { and, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { inventoryItems } from "../../db/schema.js";
import type { DbExecutor } from "./types.js";
import type { ResolvedItemTarget, UnifiedStockItemDefinition } from "./unifiedStockDeductionTypes.js";

function escapeLikePattern(raw: string): string {
	return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function resolveOrAutoCreateItems(
	tx: DbExecutor,
	organizationId: string,
	definitions: UnifiedStockItemDefinition[],
): Promise<ResolvedItemTarget[]> {
	const exactIds = Array.from(
		new Set(
			definitions
				.map((d) => d.exactItemId)
				.filter((id): id is string => typeof id === "string" && id.length > 0),
		),
	);
	const patternConditions: SQL[] = [];
	for (const def of definitions) {
		for (const p of def.patterns ?? []) {
			if (p && p.trim().length > 0) {
				patternConditions.push(ilike(inventoryItems.name, `%${escapeLikePattern(p.trim())}%`));
			}
		}
	}

	const matchOrConditions: SQL[] = [];
	if (exactIds.length > 0) {
		matchOrConditions.push(inArray(inventoryItems.id, exactIds));
	}
	if (patternConditions.length > 0) {
		matchOrConditions.push(...patternConditions);
	}

	const allOrgItems =
		matchOrConditions.length > 0
			? await tx
					.select()
					.from(inventoryItems)
					.where(and(eq(inventoryItems.organizationId, organizationId), or(...matchOrConditions)))
					.limit(200)
			: [];

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
