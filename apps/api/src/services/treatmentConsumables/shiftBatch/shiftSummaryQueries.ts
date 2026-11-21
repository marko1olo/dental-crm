/**
 * shiftSummaryQueries.ts — Layer 2: Queries and calculates shift consumable breakdown.
 * Mandate 8v / 8aa: Real per-visit dynamic calculation & BOM resolution.
 */

import { and, eq, gte, inArray, lte, ne, or } from "drizzle-orm";
import { inventoryItems, inventoryTransactions, treatmentItems, visits } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import {
	resolveRequiredMaterialsForServices,
	resolveServicesMetadata,
} from "../stockDeductionModules/serviceBomRulesMatcher.js";
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
	}

	if (todaysVisits.length === 0) {
		return {
			date: effectiveDate,
			shiftStats: { completedVisitsCount: 0, totalProceduresCount: 0, breakdown: [] },
			consumablesSummary: [],
			totalItemsCount: 0,
			overdraftItemsCount: 0,
			isAlreadyDeducted,
		};
	}

	const visitsCount = todaysVisits.length;
	const allOrgItems = await tx.select().from(inventoryItems).where(eq(inventoryItems.organizationId, organizationId));

	// Resolve procedure BOM rules for all procedures rendered during the shift
	const services = todaysTreatmentItems.map((it) => ({
		serviceToken: it.serviceId || it.title || "service",
		quantity: Math.max(1, Number(it.quantity ?? 1)),
	}));
	const serviceMetadataMap = await resolveServicesMetadata(
		tx,
		organizationId,
		services.map((s) => s.serviceToken),
	);
	const bomMaterials = await resolveRequiredMaterialsForServices(
		tx,
		organizationId,
		services,
		serviceMetadataMap,
	);

	const bomMaterialsByKey = new Map<string, number>();
	for (const mat of bomMaterials) {
		const k = mat.key.toLowerCase();
		bomMaterialsByKey.set(k, (bomMaterialsByKey.get(k) ?? 0) + mat.quantity);
		if (mat.name) {
			const nameKey = mat.name.toLowerCase();
			bomMaterialsByKey.set(nameKey, (bomMaterialsByKey.get(nameKey) ?? 0) + mat.quantity);
		}
	}

	const consumablesSummary: ShiftConsumableSummaryItem[] = [];

	for (const preset of STANDARD_SHIFT_CONSUMABLE_PRESETS) {
		const matched = allOrgItems.find((inv) =>
			preset.patterns.some((p) => inv.name.toLowerCase().includes(p.toLowerCase())),
		);

		let matchedBomQty = 0;
		for (const [bomKey, qty] of bomMaterialsByKey.entries()) {
			if (
				(matched && (bomKey === matched.id.toLowerCase() || matched.name.toLowerCase().includes(bomKey))) ||
				preset.patterns.some((p) => bomKey.includes(p.toLowerCase())) ||
				preset.defaultName.toLowerCase().includes(bomKey)
			) {
				matchedBomQty += qty;
			}
		}

		// Dynamic calculation: max of procedure BOM requirement or per-visit baseline norm
		const perVisitNorm = (preset.perVisitQty ?? 1) * visitsCount;
		const effectiveQty = Math.max(matchedBomQty, perVisitNorm);
		const qtyToDeduct = Number(effectiveQty.toFixed(2));

		if (matched) {
			const currentStock = Number(matched.stockQuantity ?? matched.currentQty ?? 0);
			const projectedStock = Number((currentStock - qtyToDeduct).toFixed(2));
			const isOverdraft = projectedStock < 0;
			consumablesSummary.push({
				itemId: matched.id,
				itemName: matched.name,
				category: matched.category ?? preset.category,
				unit: matched.unit ?? preset.unit,
				qtyToDeduct,
				currentStock,
				projectedStock,
				isOverdraft,
				deficit: isOverdraft ? Math.abs(projectedStock) : 0,
				defaultCostRub: matched.unitCostRub ?? preset.defaultCost,
			});
		} else {
			consumablesSummary.push({
				itemId: "",
				itemName: preset.defaultName,
				category: preset.category,
				unit: preset.unit,
				qtyToDeduct,
				currentStock: 0,
				projectedStock: -qtyToDeduct,
				isOverdraft: true,
				deficit: qtyToDeduct,
				defaultCostRub: preset.defaultCost,
			});
		}
	}

	return {
		date: effectiveDate,
		shiftStats: { completedVisitsCount: visitsCount, totalProceduresCount: todaysTreatmentItems.length, breakdown },
		consumablesSummary,
		totalItemsCount: consumablesSummary.length,
		overdraftItemsCount: consumablesSummary.filter((c) => c.isOverdraft).length,
		isAlreadyDeducted,
	};
}
