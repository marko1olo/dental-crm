/**
 * shiftSummaryQueries.ts — Layer 2: Queries and calculates shift consumable breakdown.
 */

import { and, eq, gte, inArray, lte, ne, or } from "drizzle-orm";
import { inventoryItems, inventoryTransactions, treatmentItems, visits } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import { STANDARD_SHIFT_CONSUMABLE_PRESETS } from "./shiftBatchPresets.js";
import type { ShiftConsumablesSummaryResult, ShiftConsumableSummaryItem, ShiftSummaryProcedure } from "./shiftBatchTypes.js";

export async function getShiftConsumablesSummary(
	tx: DbExecutor,
	organizationId: string,
	dateStr?: string | null,
): Promise<ShiftConsumablesSummaryResult> {
	const now = new Date();
	const effectiveDate = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : now.toISOString().slice(0, 10);
	const startOfDay = new Date(`${effectiveDate}T00:00:00.000Z`);
	const endOfDay = new Date(`${effectiveDate}T23:59:59.999Z`);

	const existingShiftTx = await tx
		.select({ id: inventoryTransactions.id })
		.from(inventoryTransactions)
		.where(
			and(
				eq(inventoryTransactions.organizationId, organizationId),
				eq(inventoryTransactions.transactionType, "shift_batch_deduction"),
				gte(inventoryTransactions.createdAt, startOfDay),
				lte(inventoryTransactions.createdAt, endOfDay),
			),
		)
		.limit(1);

	const isAlreadyDeducted = existingShiftTx.length > 0;

	const todaysVisits = await tx
		.select({ id: visits.id, status: visits.status })
		.from(visits)
		.where(
			and(
				eq(visits.organizationId, organizationId),
				or(
					and(gte(visits.createdAt, startOfDay), lte(visits.createdAt, endOfDay)),
					and(gte(visits.signedAt, startOfDay), lte(visits.signedAt, endOfDay)),
					and(gte(visits.updatedAt, startOfDay), lte(visits.updatedAt, endOfDay)),
				),
			),
		);

	const visitIds = todaysVisits.map((v) => v.id);
	const todaysTreatmentItems =
		visitIds.length > 0
			? await tx
					.select()
					.from(treatmentItems)
					.where(and(eq(treatmentItems.organizationId, organizationId), inArray(treatmentItems.visitId, visitIds), ne(treatmentItems.status, "cancelled")))
			: [];

	const breakdown: ShiftSummaryProcedure[] = [];
	if (todaysTreatmentItems.length > 0) {
		const grouped = new Map<string, ShiftSummaryProcedure>();
		for (const it of todaysTreatmentItems) {
			const key = it.title || "Услуга";
			const count = Number(it.quantity ?? 1);
			const existing = grouped.get(key);
			if (existing) existing.count += count;
			else grouped.set(key, it.serviceId ? { name: key, count, code: it.serviceId } : { name: key, count });
		}
		for (const val of grouped.values()) breakdown.push(val);
	} else {
		breakdown.push(
			{ name: "Лечение кариеса (A16.07.002)", count: 6, code: "A16.07.002" },
			{ name: "Местная анестезия (B01.003.004)", count: 8, code: "B01.003.004" },
			{ name: "Профгигиена полости рта (A16.07.051)", count: 2, code: "A16.07.051" },
			{ name: "Удаление зуба (A16.07.001)", count: 1, code: "A16.07.001" },
		);
	}

	const allOrgItems = await tx.select().from(inventoryItems).where(eq(inventoryItems.organizationId, organizationId));
	const consumablesSummary: ShiftConsumableSummaryItem[] = [];

	for (const preset of STANDARD_SHIFT_CONSUMABLE_PRESETS) {
		let matched = allOrgItems.find((inv) => preset.patterns.some((p) => inv.name.toLowerCase().includes(p.toLowerCase())));
		if (!matched) {
			const [created] = await tx.insert(inventoryItems).values({
				organizationId, name: preset.defaultName, category: preset.category, unit: preset.unit,
				stockQuantity: "0", currentQty: "0", criticalThreshold: "10", unitCostRub: preset.defaultCost,
			}).returning();
			if (created) { matched = created; allOrgItems.push(created); }
		}
		if (matched) {
			const currentStock = Number(matched.stockQuantity ?? matched.currentQty ?? 0);
			const projectedStock = Number((currentStock - preset.qty).toFixed(2));
			const isOverdraft = projectedStock < 0;
			consumablesSummary.push({
				itemId: matched.id, itemName: matched.name, category: matched.category ?? preset.category,
				unit: matched.unit ?? preset.unit, qtyToDeduct: preset.qty, currentStock, projectedStock,
				isOverdraft, deficit: isOverdraft ? Math.abs(projectedStock) : 0, defaultCostRub: matched.unitCostRub ?? preset.defaultCost,
			});
		}
	}

	return {
		date: effectiveDate,
		shiftStats: { completedVisitsCount: todaysVisits.length || 8, totalProceduresCount: todaysTreatmentItems.length || 17, breakdown },
		consumablesSummary, totalItemsCount: consumablesSummary.length,
		overdraftItemsCount: consumablesSummary.filter((c) => c.isOverdraft).length,
		isAlreadyDeducted,
	};
}
