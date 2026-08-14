import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import type { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	treatmentItems,
} from "../../db/schema.js";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface StockDeductionRecord {
	inventoryItemId: string;
	inventoryItemName: string;
	quantityChanged: string;
}

export interface MaterialDeductionResult {
	completedTreatmentItems: number;
	deductions: StockDeductionRecord[];
}

export class InsufficientStockError extends Error {
	readonly statusCode = 400;
	readonly error = "InsufficientStock";
	readonly inventoryItemId: string;
	readonly inventoryItemName: string;
	readonly availableStock: number;
	readonly requiredStock: number;

	constructor(params: {
		inventoryItemId: string;
		inventoryItemName: string;
		availableStock: number;
		requiredStock: number;
	}) {
		super(
			`Недостаточно материалов на складе: «${params.inventoryItemName}» (требуется ${params.requiredStock}, в наличии ${params.availableStock}).`,
		);
		this.name = "InsufficientStockError";
		this.inventoryItemId = params.inventoryItemId;
		this.inventoryItemName = params.inventoryItemName;
		this.availableStock = params.availableStock;
		this.requiredStock = params.requiredStock;
	}
}

/**
 * Списывать со склада можно только конечное положительное количество.
 */
export function isDeductibleQuantity(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}

/**
 * Атомарное и идемпотентное списание расходных материалов по приёму.
 *
 * Инварианты:
 * 1. Идемпотентность: обрабатываются только позиции лечения со статусом != 'completed'.
 *    Повторный вызов безопасен и возвращает 0 завершённых позиций и пустой список списаний.
 * 2. Защита от Deadlock: строки inventoryItems блокируются FOR UPDATE в строго сортированном порядке
 *    (по inventoryItemId ASC).
 * 3. Многоарендная изоляция: правила берутся с organizationId = orgId ИЛИ NULL (дефолтные правила),
 *    но строки склада inventoryItems и проводки inventoryTransactions строго ограничены organizationId.
 */
export async function deductMaterialsForVisit(
	tx: DbTransaction,
	params: {
		organizationId: string;
		visitId: string;
		userId: string | null;
		transactionType?: "auto_deduct" | "manual_writeoff";
	},
): Promise<MaterialDeductionResult> {
	const {
		organizationId,
		visitId,
		userId,
		transactionType = "auto_deduct",
	} = params;

	// 1. Выбираем только незавершённые позиции лечения приёма (защита от повторного списания)
	const uncompletedItems = await tx
		.select()
		.from(treatmentItems)
		.where(
			and(
				eq(treatmentItems.visitId, visitId),
				eq(treatmentItems.organizationId, organizationId),
				ne(treatmentItems.status, "completed"),
			),
		);

	if (uncompletedItems.length === 0) {
		return { completedTreatmentItems: 0, deductions: [] };
	}

	// Помечаем все позиции лечения приёма как completed
	await tx
		.update(treatmentItems)
		.set({ status: "completed" })
		.where(
			and(
				eq(treatmentItems.visitId, visitId),
				eq(treatmentItems.organizationId, organizationId),
			),
		);

	// 2. Собираем все правила списания материалов по услугам
	const serviceIds = uncompletedItems
		.map((item) => item.serviceId)
		.filter((id): id is string => typeof id === "string" && id.length > 0);

	if (serviceIds.length === 0) {
		return { completedTreatmentItems: uncompletedItems.length, deductions: [] };
	}

	const rules = await tx
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

	if (rules.length === 0) {
		return { completedTreatmentItems: uncompletedItems.length, deductions: [] };
	}

	// 3. Агрегируем требуемые количества по каждому inventoryItemId
	// Map: inventoryItemId -> requiredQuantity
	const requiredByItem = new Map<string, number>();

	for (const item of uncompletedItems) {
		if (!item.serviceId) continue;
		const serviceQuantity = Number(item.quantity);
		if (!isDeductibleQuantity(serviceQuantity)) continue;

		const matchingRules = rules.filter((r) => r.serviceId === item.serviceId);
		for (const rule of matchingRules) {
			if (!rule.inventoryItemId) continue;
			const ruleQuantity = Number(rule.quantityToDeduct);
			if (!isDeductibleQuantity(ruleQuantity)) continue;

			const deductionAmount = ruleQuantity * serviceQuantity;
			const existing = requiredByItem.get(rule.inventoryItemId) ?? 0;
			requiredByItem.set(rule.inventoryItemId, existing + deductionAmount);
		}
	}

	if (requiredByItem.size === 0) {
		return { completedTreatmentItems: uncompletedItems.length, deductions: [] };
	}

	// 4. Сортируем ID для предотвращения взаимоблокировок (Deadlock-free locking)
	const sortedItemIds = Array.from(requiredByItem.keys()).sort();

	const lockedInventoryItems = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				inArray(inventoryItems.id, sortedItemIds),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	const inventoryMap = new Map(
		lockedInventoryItems.map((inv) => [inv.id, inv]),
	);

	const deductions: StockDeductionRecord[] = [];
	const transactionsToInsert: Array<typeof inventoryTransactions.$inferInsert> =
		[];

	for (const itemId of sortedItemIds) {
		const requiredQty = requiredByItem.get(itemId);
		if (!requiredQty || requiredQty <= 0) continue;

		const inv = inventoryMap.get(itemId);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? 0);
		if (!Number.isFinite(currentStock) || currentStock < requiredQty) {
			throw new InsufficientStockError({
				inventoryItemId: inv.id,
				inventoryItemName: inv.name,
				availableStock: Number.isFinite(currentStock) ? currentStock : 0,
				requiredStock: requiredQty,
			});
		}

		const newStock = currentStock - requiredQty;
		const quantityChanged = String(-requiredQty);

		await tx
			.update(inventoryItems)
			.set({ stockQuantity: String(newStock) })
			.where(
				and(
					eq(inventoryItems.id, inv.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		transactionsToInsert.push({
			organizationId,
			visitId,
			inventoryItemId: inv.id,
			quantityChanged,
			unitCostRub: inv.unitCostRub != null ? String(inv.unitCostRub) : null,
			transactionType,
			userId,
		});

		deductions.push({
			inventoryItemId: inv.id,
			inventoryItemName: inv.name,
			quantityChanged,
		});
	}

	if (transactionsToInsert.length > 0) {
		await tx.insert(inventoryTransactions).values(transactionsToInsert);
	}

	return {
		completedTreatmentItems: uncompletedItems.length,
		deductions,
	};
}
