/**
 * stockDeductionDbOperations.ts — Layer 2: Transactional database operations & deadlock-free item locking.
 *
 * Implements:
 * - Deterministic item locking in sorted UUID order (FOR UPDATE)
 * - Auto-creation of missing catalog items on-the-fly with 0 stock (Mandate 8e & 8n)
 * - PostgreSQL advisory transaction locking (pg_advisory_xact_lock)
 * - Idempotency checks to prevent double-deduction on network retry
 * - Treatment item status reconciliation
 */

import { isDeductibleQuantity } from "@dental/shared";
import { and, eq, inArray, like, ne, or, type SQL, sql } from "drizzle-orm";
import {
	inventoryItems,
	inventoryTransactions,
	treatmentItems,
} from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import {
	isPureUuid,
	type RawRequiredMaterial,
	type ResolvedItemEntry,
	type StockDeductionResult,
} from "./stockDeductionTypes.js";

/**
 * Acquires a transactional advisory lock per (organization, visit) to serialize concurrent requests.
 */
export async function acquireVisitDeductionLock(
	tx: DbExecutor,
	organizationId: string,
	visitId: string,
): Promise<void> {
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':visit_deduct:' || ${visitId}))`,
	);
}

/**
 * Acquires a transactional advisory lock per (organization, treatmentItem) to serialize concurrent requests.
 */
export async function acquireToothDeductionLock(
	tx: DbExecutor,
	organizationId: string,
	treatmentItemId: string,
): Promise<void> {
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':tooth_deduct:' || ${treatmentItemId}))`,
	);
}

/**
 * Checks for idempotent visit deduction replay by clientMutationId or previous auto_deduct.
 */
export async function checkIdempotentVisitDeduction(
	tx: DbExecutor,
	organizationId: string,
	safeVisitId: string,
	clientMutationId: string | null | undefined,
	transactionType: "auto_deduct" | "manual_writeoff",
): Promise<StockDeductionResult | null> {
	if (clientMutationId) {
		const existingMutationTx = await tx
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					eq(inventoryTransactions.visitId, safeVisitId),
					like(inventoryTransactions.notes, `%[mutation:${clientMutationId}]%`),
				),
			);

		if (existingMutationTx.length > 0) {
			return {
				completedTreatmentItems: 0,
				deductions: existingMutationTx.map((txRow) => ({
					inventoryItemId: txRow.itemId ?? txRow.inventoryItemId ?? "unknown",
					inventoryItemName: "Ранее списанный материал",
					quantityChanged: String(txRow.quantityChanged ?? txRow.qty ?? "0"),
					unitCostRub: txRow.unitCostRub,
					lotNumber: null,
					remainingStock: 0,
				})),
				warnings: [
					{
						type: "low_stock",
						itemId: existingMutationTx[0]?.itemId ?? "idempotent",
						itemName: "Списание расходников",
						message: `Повторный запрос списания материалов (ключ ${clientMutationId}). Операция дедуплицирована.`,
						currentStock: 0,
						criticalThreshold: 0,
					},
				],
				isOverdraft: false,
			};
		}
	}

	if (transactionType === "auto_deduct") {
		const existingAutoDeductTx = await tx
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					eq(inventoryTransactions.visitId, safeVisitId),
					inArray(inventoryTransactions.transactionType, ["auto_deduct", "emergency_overdraft"]),
				),
			);

		if (existingAutoDeductTx.length > 0) {
			return {
				completedTreatmentItems: 0,
				deductions: existingAutoDeductTx.map((txRow) => ({
					inventoryItemId: txRow.itemId ?? txRow.inventoryItemId ?? "unknown",
					inventoryItemName: "Ранее списанный материал",
					quantityChanged: String(txRow.quantityChanged ?? txRow.qty ?? "0"),
					unitCostRub: txRow.unitCostRub,
					lotNumber: null,
					remainingStock: 0,
				})),
				warnings: [
					{
						type: "low_stock",
						itemId: existingAutoDeductTx[0]?.itemId ?? "idempotent",
						itemName: "Списание расходников",
						message: `Расходники по визиту ${safeVisitId} уже были автоматически списаны ранее. Повторное списание предотвращено (защита от дублирования).`,
						currentStock: 0,
						criticalThreshold: 0,
					},
				],
				isOverdraft: false,
			};
		}
	}

	return null;
}

/**
 * Checks for idempotent tooth treatment deduction replay by clientMutationId or previous auto_deduct.
 */
export async function checkIdempotentToothDeduction(
	tx: DbExecutor,
	organizationId: string,
	treatmentItemId: string,
	clientMutationId: string | null | undefined,
	transactionType: "auto_deduct" | "manual_writeoff",
): Promise<StockDeductionResult | null> {
	if (clientMutationId) {
		const existingMutationTx = await tx
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					like(inventoryTransactions.notes, `%[mutation:${clientMutationId}]%`),
				),
			);

		if (existingMutationTx.length > 0) {
			return {
				completedTreatmentItems: 0,
				deductions: existingMutationTx.map((txRow) => ({
					inventoryItemId: txRow.itemId ?? txRow.inventoryItemId ?? "unknown",
					inventoryItemName: "Ранее списанный материал",
					quantityChanged: String(txRow.quantityChanged ?? txRow.qty ?? "0"),
					unitCostRub: txRow.unitCostRub,
					lotNumber: null,
					remainingStock: 0,
				})),
				warnings: [
					{
						type: "low_stock",
						itemId: existingMutationTx[0]?.itemId ?? "idempotent",
						itemName: "Списание расходников",
						message: `Повторный запрос списания материалов по позиции лечения (ключ ${clientMutationId}). Операция дедуплицирована.`,
						currentStock: 0,
						criticalThreshold: 0,
					},
				],
				isOverdraft: false,
			};
		}
	}

	if (transactionType === "auto_deduct") {
		const existingItemTx = await tx
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					like(inventoryTransactions.notes, `%[treatmentItemId:${treatmentItemId}]%`),
					inArray(inventoryTransactions.transactionType, ["auto_deduct", "emergency_overdraft"]),
				),
			);

		if (existingItemTx.length > 0) {
			return {
				completedTreatmentItems: 0,
				deductions: existingItemTx.map((txRow) => ({
					inventoryItemId: txRow.itemId ?? txRow.inventoryItemId ?? "unknown",
					inventoryItemName: "Ранее списанный материал",
					quantityChanged: String(txRow.quantityChanged ?? txRow.qty ?? "0"),
					unitCostRub: txRow.unitCostRub,
					lotNumber: null,
					remainingStock: 0,
				})),
				warnings: [
					{
						type: "low_stock",
						itemId: existingItemTx[0]?.itemId ?? "idempotent",
						itemName: "Списание расходников",
						message: `Материалы по позиции лечения ${treatmentItemId} уже были автоматически списаны ранее. Повторное списание предотвращено (защита от дублирования).`,
						currentStock: 0,
						criticalThreshold: 0,
					},
				],
				isOverdraft: false,
			};
		}
	}

	return null;
}

/**
 * Fetches target treatment items for a visit and marks uncompleted ones as completed.
 */
export async function fetchAndCompleteTreatmentItemsForVisit(
	tx: DbExecutor,
	organizationId: string,
	safeVisitId: string,
): Promise<Array<typeof treatmentItems.$inferSelect>> {
	let targetItems = await tx
		.select()
		.from(treatmentItems)
		.where(
			and(
				eq(treatmentItems.visitId, safeVisitId),
				eq(treatmentItems.organizationId, organizationId),
				ne(treatmentItems.status, "completed"),
			),
		);

	if (targetItems.length === 0) {
		const existingTx = await tx
			.select({ id: inventoryTransactions.id })
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.visitId, safeVisitId),
					eq(inventoryTransactions.organizationId, organizationId),
				),
			)
			.limit(1);

		if (existingTx.length === 0) {
			targetItems = await tx
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.visitId, safeVisitId),
						eq(treatmentItems.organizationId, organizationId),
						ne(treatmentItems.status, "cancelled"),
					),
				);
		}
	}

	const uncompletedToMark = targetItems.filter((it) => it.status !== "completed");
	if (uncompletedToMark.length > 0) {
		await tx
			.update(treatmentItems)
			.set({ status: "completed" })
			.where(
				and(
					eq(treatmentItems.visitId, safeVisitId),
					eq(treatmentItems.organizationId, organizationId),
					inArray(
						treatmentItems.id,
						uncompletedToMark.map((it) => it.id),
					),
				),
			);
	}

	return targetItems;
}

/**
 * Resolves material keys into database inventory items, auto-creates missing items,
 * and locks items in deterministic UUID order to prevent deadlocks.
 */
export async function resolveAndLockInventoryItems(
	tx: DbExecutor,
	organizationId: string,
	rawMaterials: RawRequiredMaterial[],
): Promise<ResolvedItemEntry[]> {
	if (rawMaterials.length === 0) return [];

	// 1. Aggregate quantities and metadata by key
	const aggregated = new Map<string, {
		key: string;
		quantity: number;
		unit: string;
		name?: string | undefined;
		defaultCostRub?: number | undefined;
		isMdlpRequired?: boolean | undefined;
	}>();

	for (const m of rawMaterials) {
		if (!m.key || !isDeductibleQuantity(m.quantity)) continue;
		const existing = aggregated.get(m.key);
		if (existing) {
			existing.quantity += m.quantity;
		} else {
			aggregated.set(m.key, { ...m });
		}
	}

	if (aggregated.size === 0) return [];

	const keys = Array.from(aggregated.keys());
	const uuidKeys = keys.filter(isPureUuid);
	const nonUuidKeys = keys.filter((k) => !isPureUuid(k));

	// 2. Query existing inventory items
	const findConditions: Array<SQL<unknown>> = [];
	if (uuidKeys.length > 0) {
		findConditions.push(inArray(inventoryItems.id, uuidKeys));
	}
	if (nonUuidKeys.length > 0) {
		findConditions.push(
			inArray(inventoryItems.sku, nonUuidKeys),
			inArray(inventoryItems.barcode, nonUuidKeys),
			inArray(inventoryItems.name, nonUuidKeys),
		);
	}

	const existingRows = findConditions.length > 0
		? await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						or(...findConditions),
					),
				)
		: [];

	let allClinicItemsCache: (typeof inventoryItems.$inferSelect)[] | null = null;
	const keyToItemMap = new Map<string, typeof inventoryItems.$inferSelect>();

	for (const [key, entry] of aggregated.entries()) {
		const isUuid = isPureUuid(key);
		let matched = existingRows.find(
			(row) =>
				(isUuid && row.id === key) ||
				row.sku === key ||
				row.barcode === key ||
				row.name === key ||
				(entry.name && row.name.toLowerCase() === entry.name.toLowerCase()),
		);

		if (!matched && !isUuid) {
			if (!allClinicItemsCache) {
				allClinicItemsCache = await tx
					.select()
					.from(inventoryItems)
					.where(eq(inventoryItems.organizationId, organizationId));
			}
			const clinicItems = allClinicItemsCache ?? [];
			const lowerKey = String(key).toLowerCase();
			const lowerName = entry.name ? String(entry.name).toLowerCase() : "";
			matched = clinicItems.find((row) => {
				const rowLower = (row.name || "").toLowerCase();
				return (
					rowLower === lowerKey ||
					(lowerName.length > 0 && rowLower === lowerName) ||
					(lowerKey.includes("артикаин") && rowLower.includes("артикаин")) ||
					(lowerKey.includes("filtek") && rowLower.includes("filtek")) ||
					(lowerKey.includes("игла") && rowLower.includes("игла"))
				);
			});
		}

		if (matched) {
			keyToItemMap.set(key, matched);
		}
	}

	// 3. Auto-create uncataloged missing items on-the-fly (Mandate 8e & 8n)
	for (const [key, entry] of aggregated.entries()) {
		if (keyToItemMap.has(key)) continue;

		const isUuid = isPureUuid(key);
		const fallbackName = entry.name || (isUuid ? `Материал ${key}` : key);
		const defaultCost = entry.defaultCostRub != null ? String(entry.defaultCostRub) : "0";

		const [created] = await tx
			.insert(inventoryItems)
			.values({
				...(isUuid ? { id: key } : {}),
				organizationId,
				sku: isUuid ? null : key,
				name: fallbackName,
				unit: entry.unit || "шт",
				stockQuantity: "0",
				currentQty: "0",
				criticalThreshold: "0",
				unitCostRub: defaultCost,
			})
			.returning();

		if (created) {
			keyToItemMap.set(key, created);
		}
	}

	// 4. Collect unique UUIDs and lock in deterministic sorted order (deadlock-free)
	const distinctResolvedUuids = Array.from(
		new Set(Array.from(keyToItemMap.values()).map((it) => it.id)),
	).sort();

	if (distinctResolvedUuids.length === 0) return [];

	const lockedRows = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.organizationId, organizationId),
				inArray(inventoryItems.id, distinctResolvedUuids),
			),
		)
		.for("update");

	const lockedById = new Map(lockedRows.map((row) => [row.id, row]));

	// 5. Aggregate by final locked item ID to prevent multi-deduct collisions
	const byFinalItemId = new Map<string, {
		item: typeof inventoryItems.$inferSelect;
		requiredQty: number;
		ruleUnit: string;
		isMdlpRequired?: boolean | undefined;
	}>();

	for (const [key, entry] of aggregated.entries()) {
		const rawItem = keyToItemMap.get(key);
		if (!rawItem) continue;
		const lockedItem = lockedById.get(rawItem.id);
		if (!lockedItem) continue;

		const existing = byFinalItemId.get(lockedItem.id);
		if (existing) {
			existing.requiredQty += entry.quantity;
		} else {
			byFinalItemId.set(lockedItem.id, {
				item: lockedItem,
				requiredQty: entry.quantity,
				ruleUnit: entry.unit,
				isMdlpRequired: entry.isMdlpRequired,
			});
		}
	}

	return Array.from(byFinalItemId.values());
}
