/**
 * stockDeduction.ts — Layer 2: Core transactional stock deduction for visits and tooth treatments.
 * Implements FEFO deduction, soft overdraft, deadlock-free key sorting (FOR UPDATE), and advisory locking.
 */

import {
	type StockDeductionRecord,
	type StockDeductionResult,
	type StockDeductionWarning,
	categorizeInventoryExpiry,
	isDeductibleQuantity,
} from "@dental/shared";
import { and, eq, inArray, isNull, like, ne, or, sql } from "drizzle-orm";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	treatmentItems,
} from "../../db/schema.js";
import { fefoStockService } from "../inventory/fefoStockService.js";
import {
	type DbExecutor,
	toValidUuid,
} from "./types.js";

/**
 * Deduct batch quantities from warehouse stock when a visit is completed.
 */
export async function deductForVisit(
	tx: DbExecutor,
	params: {
		organizationId: string;
		visitId: string;
		userId?: string | null | undefined;
		transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
		clientMutationId?: string | null | undefined;
		services?: Array<{ serviceId: string; quantity?: number | undefined }> | undefined;
		items?: Array<{ inventoryItemId: string; quantity: number; reason?: string | null | undefined }> | undefined;
		carpulesCount?: number | undefined;
		drugName?: string | undefined;
		paperJournalAcknowledged?: boolean | undefined;
		allowOverdraft?: boolean | undefined;
	},
): Promise<StockDeductionResult> {
	const {
		organizationId,
		visitId,
		userId = null,
		transactionType = "auto_deduct",
		clientMutationId = null,
	} = params;

	const safeVisitId = toValidUuid(visitId);

	// 0. Acquire transactional advisory lock per (organization, visit) to serialize concurrent requests
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':visit_deduct:' || ${visitId}))`,
	);

	// Check for idempotent replay by clientMutationId or existing auto_deduct
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
						message: `Расходники по визиту ${visitId} уже были автоматически списаны ранее. Повторное списание предотвращено (защита от дублирования).`,
						currentStock: 0,
						criticalThreshold: 0,
					},
				],
				isOverdraft: false,
			};
		}
	}

	// 1. Fetch target treatment items for visit (uncompleted first, with fallback to completed if no tx exist)
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
		// Проверяем: возможно, врач уже завершил прием, но списание материалов со склада ещё не производилось!
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

	// Помечаем незавершённые строки приёма как завершённые
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

	// 2. Gather service IDs from visit items and direct parameters
	const serviceIdsFromItems = targetItems
		.map((it) => it.serviceId)
		.filter((id): id is string => typeof id === "string" && id.length > 0);

	const serviceIdsFromParams = (params.services ?? [])
		.map((s) => s.serviceId)
		.filter((id): id is string => typeof id === "string" && id.length > 0);

	const allServiceIds = Array.from(
		new Set([...serviceIdsFromItems, ...serviceIdsFromParams]),
	);

	// 3. Find procedure material rules
	const rules = allServiceIds.length > 0
		? await tx
			.select()
			.from(procedureMaterialRules)
			.where(
				and(
					inArray(procedureMaterialRules.serviceId, allServiceIds),
					or(
						eq(procedureMaterialRules.organizationId, organizationId),
						isNull(procedureMaterialRules.organizationId),
					),
				),
			)
		: [];

	// 4. Aggregate required quantities
	const requiredByItem = new Map<string, number>();

	// 4a. Deductions from treatment items
	for (const item of targetItems) {
		if (!item.serviceId) continue;
		const serviceQty = Number(item.quantity ?? 1);
		if (!isDeductibleQuantity(serviceQty)) continue;

		const matchingRules = rules.filter((r) => r.serviceId === item.serviceId);
		for (const rule of matchingRules) {
			const itemId = rule.inventoryItemId ?? rule.materialItemId;
			if (!itemId) continue;
			const ruleQty = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 1);
			if (!isDeductibleQuantity(ruleQty)) continue;

			const deductionAmount = ruleQty * serviceQty;
			const current = requiredByItem.get(itemId) ?? 0;
			requiredByItem.set(itemId, current + deductionAmount);
		}
	}

	// 4b. Deductions from directly passed services
	if (params.services && params.services.length > 0) {
		for (const srv of params.services) {
			if (!srv.serviceId) continue;
			const srvQty = Number(srv.quantity ?? 1);
			if (!isDeductibleQuantity(srvQty)) continue;

			const matchingRules = rules.filter((r) => r.serviceId === srv.serviceId);
			for (const rule of matchingRules) {
				const itemId = rule.inventoryItemId ?? rule.materialItemId;
				if (!itemId) continue;
				const ruleQty = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 1);
				if (!isDeductibleQuantity(ruleQty)) continue;

				const deductionAmount = ruleQty * srvQty;
				const current = requiredByItem.get(itemId) ?? 0;
				requiredByItem.set(itemId, current + deductionAmount);
			}
		}
	}

	// 4c. Deductions from directly passed items
	if (params.items && params.items.length > 0) {
		for (const it of params.items) {
			if (!it.inventoryItemId) continue;
			const qty = Number(it.quantity);
			if (!isDeductibleQuantity(qty)) continue;
			const current = requiredByItem.get(it.inventoryItemId) ?? 0;
			requiredByItem.set(it.inventoryItemId, current + qty);
		}
	}

	// 4d. Deductions from carpulesCount (anesthetics auto-matching)
	if (params.carpulesCount && params.carpulesCount > 0) {
		const drugSearch = (params.drugName || "артикаин").toLowerCase();
		const clinicItems = await tx
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, organizationId));

		let anestheticItem = clinicItems.find(
			(inv) =>
				(params.drugName && inv.name.toLowerCase().includes(drugSearch)) ||
				inv.name.toLowerCase().includes("артикаин") ||
				inv.name.toLowerCase().includes("ультракаин") ||
				inv.name.toLowerCase().includes("септонест") ||
				inv.name.toLowerCase().includes("скандонест") ||
				inv.name.toLowerCase().includes("анесте") ||
				(inv.unit && inv.unit.toLowerCase().includes("карп")),
		);
		if (!anestheticItem && clinicItems.length > 0) {
			anestheticItem = clinicItems[0];
		}
		if (anestheticItem) {
			const current = requiredByItem.get(anestheticItem.id) ?? 0;
			requiredByItem.set(anestheticItem.id, current + params.carpulesCount);
		}
	}

	if (requiredByItem.size === 0) {
		return {
			completedTreatmentItems: targetItems.length,
			deductions: [],
			warnings: [],
			isOverdraft: false,
		};
	}

	// 5. Lock inventory items in sorted order (deadlock-free)
	const sortedItemIds = Array.from(requiredByItem.keys()).sort();

	const lockedItems = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				inArray(inventoryItems.id, sortedItemIds),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	const itemMap = new Map(lockedItems.map((it) => [it.id, it]));

	const deductions: StockDeductionRecord[] = [];
	const warnings: StockDeductionWarning[] = [];
	let hasAnyOverdraft = false;

	for (const itemId of sortedItemIds) {
		const requiredQty = requiredByItem.get(itemId);
		if (!requiredQty || requiredQty <= 0) continue;

		const inv = itemMap.get(itemId);
		if (!inv) {
			continue;
		}

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - requiredQty).toFixed(4));
		const threshold = Number(inv.criticalThreshold ?? inv.minQty ?? 0);

		const noteText =
			(newStock < 0
				? `Списано под операцию, требуется оприходование (мягкий минусовой овердрафт партии, накладная ещё не внесена по приёму ${visitId}): дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."}${params.paperJournalAcknowledged ? " (бумажный журнал учтён, старшая медсестра опциональна)" : ""}`
				: `Автосписание по приёму ${visitId}${params.paperJournalAcknowledged ? " (бумажный журнал учтён, старшая медсестра опциональна)" : ""}`) +
			(clientMutationId ? ` [mutation:${clientMutationId}]` : "");

		const fefoRes = await fefoStockService.deductFefo(tx as any, {
			organizationId,
			inventoryItemId: inv.id,
			requiredQty,
			visitId: safeVisitId,
			userId,
			allowOverdraft: params.allowOverdraft ?? true,
			transactionType,
			notes: noteText,
		});

		if (fefoRes.isOverdraft || newStock < 0) {
			hasAnyOverdraft = true;
			warnings.push({
				type: "out_of_stock",
				itemId: inv.id,
				itemName: inv.name,
				message: `Внимание: списание в дефицит по материалу «${inv.name}» (в наличии было ${baseStock}, списано ${requiredQty}, остаток: ${newStock} ${inv.unit ?? "шт"}). Списано под операцию, требуется оприходование (мягкий минусовой овердрафт партии, накладная ещё не внесена).`,
				currentStock: newStock,
				criticalThreshold: threshold,
				expirationDate: inv.expirationDate,
			});
		} else if (newStock <= threshold) {
			warnings.push({
				type: newStock === 0 ? "out_of_stock" : "low_stock",
				itemId: inv.id,
				itemName: inv.name,
				message:
					newStock === 0
						? `Материал «${inv.name}» полностью израсходован на складе.`
						: `Остаток материала «${inv.name}» снизился до критического порога (${newStock} ${inv.unit ?? "шт"}, порог: ${threshold}).`,
				currentStock: newStock,
				criticalThreshold: threshold,
				expirationDate: inv.expirationDate,
			});
		}

		// Check expiration warning
		if (inv.expirationDate) {
			const expiry = categorizeInventoryExpiry(inv.expirationDate);
			if (expiry.status === "expired") {
				warnings.push({
					type: "expired",
					itemId: inv.id,
					itemName: inv.name,
					message: `Внимание: партия материала «${inv.name}» просрочена (срок: ${inv.expirationDate}).`,
					expirationDate: inv.expirationDate,
				});
			} else if (expiry.status === "expiring_soon") {
				warnings.push({
					type: "expiring_soon",
					itemId: inv.id,
					itemName: inv.name,
					message: `Внимание: срок годности партии материала «${inv.name}» истекает через ${expiry.daysRemaining} дн. (${inv.expirationDate}).`,
					expirationDate: inv.expirationDate,
				});
			}
		}

		deductions.push({
			inventoryItemId: inv.id,
			inventoryItemName: inv.name,
			quantityChanged: String(-fefoRes.deductedQty),
			unitCostRub: inv.unitCostRub,
			lotNumber: inv.lotNumber,
			remainingStock: newStock,
		});
	}

	return {
		completedTreatmentItems: targetItems.length,
		deductions,
		warnings,
		isOverdraft: hasAnyOverdraft,
	};
}

/**
 * Deduct batch quantities for a single tooth treatment item.
 */
export async function deductForToothTreatment(
	tx: DbExecutor,
	params: {
		organizationId: string;
		treatmentItemId: string;
		serviceId: string;
		visitId?: string | null | undefined;
		toothNumber?: number | null | undefined;
		quantity?: number | undefined;
		userId?: string | null | undefined;
		transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
		clientMutationId?: string | null | undefined;
	},
): Promise<StockDeductionResult> {
	const {
		organizationId,
		treatmentItemId,
		serviceId,
		visitId = null,
		toothNumber = null,
		quantity = 1,
		userId = null,
		transactionType = "auto_deduct",
		clientMutationId = null,
	} = params;

	// 0. Acquire transactional advisory lock per (organization, treatmentItem) to serialize concurrent requests
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':tooth_deduct:' || ${treatmentItemId}))`,
	);

	// Check for idempotent replay by clientMutationId or existing auto_deduct
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

	// 1. Fetch rules for service
	const rules = await tx
		.select()
		.from(procedureMaterialRules)
		.where(
			and(
				eq(procedureMaterialRules.serviceId, serviceId),
				or(
					eq(procedureMaterialRules.organizationId, organizationId),
					isNull(procedureMaterialRules.organizationId),
				),
			),
		);

	if (rules.length === 0) {
		return { completedTreatmentItems: 1, deductions: [], warnings: [] };
	}

	// 2. Calculate required quantities
	const requiredByItem = new Map<string, number>();
	for (const rule of rules) {
		const itemId = rule.inventoryItemId ?? rule.materialItemId;
		if (!itemId) continue;
		const ruleQty = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 1);
		if (!isDeductibleQuantity(ruleQty)) continue;

		const deductionAmount = ruleQty * quantity;
		const current = requiredByItem.get(itemId) ?? 0;
		requiredByItem.set(itemId, current + deductionAmount);
	}

	if (requiredByItem.size === 0) {
		return { completedTreatmentItems: 1, deductions: [], warnings: [] };
	}

	// 3. Lock items in sorted order
	const sortedItemIds = Array.from(requiredByItem.keys()).sort();

	const lockedItems = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				inArray(inventoryItems.id, sortedItemIds),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	const itemMap = new Map(lockedItems.map((it) => [it.id, it]));

	const deductions: StockDeductionRecord[] = [];
	const warnings: StockDeductionWarning[] = [];
	const transactionsToInsert: Array<typeof inventoryTransactions.$inferInsert> = [];

	for (const itemId of sortedItemIds) {
		const requiredQty = requiredByItem.get(itemId);
		if (!requiredQty || requiredQty <= 0) continue;

		const inv = itemMap.get(itemId);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - requiredQty).toFixed(4));
		const quantityChanged = String(-requiredQty);
		const threshold = Number(inv.criticalThreshold ?? inv.minQty ?? 0);

		if (newStock < 0) {
			console.warn(
				`[treatmentConsumablesService] Списание в дефицит по материалу «${inv.name}» (ID: ${inv.id}) ` +
					`по позиции лечения ${treatmentItemId}: в наличии ${baseStock}, требовалось ${requiredQty}, итоговый дефицит: ${newStock}.`,
			);
			warnings.push({
				type: "out_of_stock",
				itemId: inv.id,
				itemName: inv.name,
				message: `Внимание: списание в дефицит по материалу «${inv.name}» (в наличии было ${baseStock}, списано ${requiredQty}, остаток: ${newStock} ${inv.unit ?? "шт"}). Списано под операцию, требуется оприходование.`,
				currentStock: newStock,
				criticalThreshold: threshold,
				expirationDate: inv.expirationDate,
			});
		} else if (newStock <= threshold) {
			warnings.push({
				type: newStock === 0 ? "out_of_stock" : "low_stock",
				itemId: inv.id,
				itemName: inv.name,
				message:
					newStock === 0
						? `Материал «${inv.name}» полностью израсходован.`
						: `Остаток материала «${inv.name}» ниже нормы (${newStock} ${inv.unit ?? "шт"}).`,
				currentStock: newStock,
				criticalThreshold: threshold,
				expirationDate: inv.expirationDate,
			});
		}

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, inv.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		const isOverdraft = newStock < 0;
		const noteMarkers = [
			`[treatmentItemId:${treatmentItemId}]`,
			clientMutationId ? `[mutation:${clientMutationId}]` : null,
		]
			.filter(Boolean)
			.join(" ");

		transactionsToInsert.push({
			organizationId,
			visitId: visitId || null,
			itemId: inv.id,
			inventoryItemId: inv.id,
			quantityChanged,
			qty: quantityChanged,
			unitCostRub: inv.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : transactionType,
			isOverdraft,
			userId,
			notes: isOverdraft
				? `Списано под операцию, требуется оприходование (мягкий овердрафт склада по позиции лечения ${treatmentItemId}${toothNumber ? ` зуб ${toothNumber}` : ""}): дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."} ${noteMarkers}`
				: `Списание по позиции лечения ${treatmentItemId}${toothNumber ? ` (зуб ${toothNumber})` : ""} ${noteMarkers}`,
		});

		deductions.push({
			inventoryItemId: inv.id,
			inventoryItemName: inv.name,
			quantityChanged,
			unitCostRub: inv.unitCostRub,
			lotNumber: inv.lotNumber,
			remainingStock: newStock,
		});
	}

	if (transactionsToInsert.length > 0) {
		await tx.insert(inventoryTransactions).values(transactionsToInsert);
	}

	return {
		completedTreatmentItems: 1,
		deductions,
		warnings,
	};
}
