import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import type { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	treatmentItems,
} from "../../db/schema.js";
import { fefoStockService } from "./fefoStockService.js";

export type DbTransaction =
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| TenantDb;

export interface StockDeductionRecord {
	inventoryItemId: string;
	inventoryItemName: string;
	quantityChanged: string;
	unitCostRub?: string | null;
	isOverdraft?: boolean;
	deficitQty?: number;
}

export interface MaterialDeductionResult {
	completedTreatmentItems: number;
	deductions: StockDeductionRecord[];
	hasOverdraft?: boolean | undefined;
	isOverdraft?: boolean | undefined;
	warning?: string | undefined;
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
 * 4. Fallback к 804н BOM (Mandates 8e, 8n): если в БД нет кастомных правил procedureMaterialRules,
 *    списание автоматически производится по техкартам процедур (fefoStockService.deductForProcedure).
 */
export async function deductMaterialsForVisit(
	tx: DbTransaction,
	params: {
		organizationId: string;
		visitId: string;
		userId: string | null;
		transactionType?: "auto_deduct" | "manual_writeoff";
		services?: Array<{ serviceId: string; quantity?: number }>;
		items?: Array<{ inventoryItemId: string; quantity: number }>;
	},
): Promise<MaterialDeductionResult> {
	const {
		organizationId,
		visitId,
		userId,
		transactionType = "auto_deduct",
		services: directServices,
		items: directItems,
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

	const deductions: StockDeductionRecord[] = [];
	let hasOverdraft = false;

	if (uncompletedItems.length === 0) {
		// Поддержка прямого списания по переданным услугам / материалам (Mandate 8v)
		if (directServices && directServices.length > 0) {
			for (const srv of directServices) {
				const procDeductions = await fefoStockService.deductForProcedure(tx, {
					organizationId,
					serviceId: srv.serviceId,
					serviceQuantity: srv.quantity ?? 1,
					visitId,
					userId,
					allowOverdraft: true,
					transactionType,
				});
				for (const pd of procDeductions) {
					if (pd.isOverdraft) hasOverdraft = true;
					deductions.push({
						inventoryItemId: pd.inventoryItemId,
						inventoryItemName: pd.inventoryItemName,
						quantityChanged: String(-pd.deductedQty),
						isOverdraft: pd.isOverdraft,
						deficitQty: pd.deficitQty,
					});
				}
			}
		}

		if (directItems && directItems.length > 0) {
			for (const it of directItems) {
				const res = await fefoStockService.deductFefo(tx, {
					organizationId,
					inventoryItemId: it.inventoryItemId,
					requiredQty: it.quantity,
					visitId,
					userId,
					allowOverdraft: true,
					transactionType,
					notes: `Списание по визиту ${visitId}`,
				});
				if (res.isOverdraft) hasOverdraft = true;
				deductions.push({
					inventoryItemId: res.inventoryItemId,
					inventoryItemName: res.inventoryItemName,
					quantityChanged: String(-res.deductedQty),
					isOverdraft: res.isOverdraft,
					deficitQty: res.deficitQty,
				});
			}
		}

		return {
			completedTreatmentItems: 0,
			deductions,
			hasOverdraft,
			isOverdraft: hasOverdraft,
			...(hasOverdraft ? { warning: "soft_overdraft" } : {}),
		};
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

	const rules = serviceIds.length > 0
		? await tx
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
			)
		: [];

	// 3. Агрегируем требуемые количества по каждому inventoryItemId из кастомных правил
	// Map: inventoryItemId -> requiredQuantity
	const requiredByItem = new Map<string, number>();
	const servicesCoveredByRules = new Set<string>();

	for (const item of uncompletedItems) {
		if (!item.serviceId) continue;
		const serviceQuantity = Number(item.quantity);
		if (!isDeductibleQuantity(serviceQuantity)) continue;

		const matchingRules = rules.filter((r) => r.serviceId === item.serviceId);
		if (matchingRules.length > 0) {
			servicesCoveredByRules.add(item.serviceId);
			for (const rule of matchingRules) {
				if (!rule.inventoryItemId) continue;
				const ruleQuantity = Number(rule.quantityToDeduct);
				if (!isDeductibleQuantity(ruleQuantity)) continue;

				const deductionAmount = ruleQuantity * serviceQuantity;
				const existing = requiredByItem.get(rule.inventoryItemId) ?? 0;
				requiredByItem.set(rule.inventoryItemId, existing + deductionAmount);
			}
		}
	}

	// 4. Сортируем ID для предотвращения взаимоблокировок (Deadlock-free locking)
	const sortedItemIds = Array.from(requiredByItem.keys()).sort();

	if (sortedItemIds.length > 0) {
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

		for (const itemId of sortedItemIds) {
			const requiredQty = requiredByItem.get(itemId);
			if (!requiredQty || requiredQty <= 0) continue;

			const inv = inventoryMap.get(itemId);
			if (!inv) continue;

			const fefoRes = await fefoStockService.deductFefo(tx, {
				organizationId,
				inventoryItemId: inv.id,
				requiredQty,
				visitId,
				userId,
				allowOverdraft: true,
				transactionType,
				notes: `Списание по визиту ${visitId}`,
			});

			if (fefoRes.isOverdraft) {
				hasOverdraft = true;
			}

			deductions.push({
				inventoryItemId: inv.id,
				inventoryItemName: inv.name,
				quantityChanged: String(-fefoRes.deductedQty),
				unitCostRub: inv.unitCostRub != null ? String(inv.unitCostRub) : null,
				isOverdraft: fefoRes.isOverdraft,
				deficitQty: fefoRes.deficitQty,
			});
		}
	}

	// 5. Для позиций без кастомных правил procedureMaterialRules списываем по техкартам 804н (BOM)
	for (const item of uncompletedItems) {
		if (!item.serviceId) continue;
		if (servicesCoveredByRules.has(item.serviceId)) continue;
		const srvQty = Number(item.quantity) || 1;
		if (!isDeductibleQuantity(srvQty)) continue;

		const procDeductions = await fefoStockService.deductForProcedure(tx, {
			organizationId,
			serviceId: item.serviceId,
			serviceQuantity: srvQty,
			visitId,
			userId,
			allowOverdraft: true,
			transactionType,
		});

		for (const pd of procDeductions) {
			if (pd.isOverdraft) hasOverdraft = true;
			deductions.push({
				inventoryItemId: pd.inventoryItemId,
				inventoryItemName: pd.inventoryItemName,
				quantityChanged: String(-pd.deductedQty),
				isOverdraft: pd.isOverdraft,
				deficitQty: pd.deficitQty,
			});
		}
	}

	return {
		completedTreatmentItems: uncompletedItems.length,
		deductions,
		hasOverdraft,
		isOverdraft: hasOverdraft,
		...(hasOverdraft ? { warning: "soft_overdraft" } : {}),
	};
}

