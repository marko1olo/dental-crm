/**
 * @file fefoDeficitResolver.ts
 * Расчет дефицита и подготовка транзакций овердрафта при нехватке партий FEFO (Мандат 8b).
 */

import {
	generateSupplierPurchaseOrder,
	resolveCostKopecks,
	type SupplierPurchaseOrder,
} from "@dental/shared";
import type { InventoryTransactionInsert } from "./auditLogging.js";

export function resolveDeficitAndOverdraft(params: {
	readonly inv: {
		id: string;
		name: string;
		unit?: string | null;
		unitCostRub?: string | null;
		unitCostKopecks?: bigint | null;
	};
	readonly needed: number;
	readonly currentStock: number;
	readonly requiredQty: number;
	readonly allowOverdraft: boolean;
	readonly organizationId: string;
	readonly visitId?: string | null;
	readonly warehouseId?: string | null;
	readonly transactionType: string;
	readonly userId?: string | null;
	readonly notes?: string | null;
	readonly metadata?: Record<string, unknown> | null | undefined;
}) {
	const {
		inv,
		needed,
		currentStock,
		requiredQty,
		allowOverdraft,
		organizationId,
		visitId,
		warehouseId,
		transactionType,
		userId,
		notes,
		metadata,
	} = params;

	const resolvedDefaultCostKopecks = resolveCostKopecks(inv.unitCostKopecks, inv.unitCostRub);

	const additionalTransactions: InventoryTransactionInsert[] = [];
	let isOverdraft = false;
	let deficitQty = 0;
	let warning: string | undefined;
	let purchaseOrderDraft: SupplierPurchaseOrder | null = null;

	if (needed > 0) {
		const alreadyDeducted = requiredQty - needed;
		const availableUnbatched = Math.max(0, currentStock - alreadyDeducted);
		const unbatchedDeduct = Math.min(needed, availableUnbatched);
		const trueDeficit = Number((needed - unbatchedDeduct).toFixed(4));

		if (unbatchedDeduct > 0) {
			additionalTransactions.push({
				organizationId,
				visitId: visitId ?? null,
				itemId: inv.id,
				inventoryItemId: inv.id,
				batchId: null,
				warehouseId: warehouseId ?? null,
				qty: String(-unbatchedDeduct),
				quantityChanged: String(-unbatchedDeduct),
				unitCostRub: inv.unitCostRub ?? null,
				unitCostKopecks: resolvedDefaultCostKopecks,
				transactionType,
				isOverdraft: false,
				userId: userId ?? null,
				notes: notes ?? (visitId ? `Списание по визиту ${visitId} (остаток номенклатуры)` : null),
				metadata: metadata ?? null,
			});
		}

		if (trueDeficit > 0) {
			deficitQty = trueDeficit;
			// Мандат 8n & Soft Negative Stock: жесткий отказ ликвидирован,
			// операция завершается успешно с мягким овердрафтом (код 200 OK)
			// и неблокирующим статусом «Требуется пополнение».
			isOverdraft = true;
			warning = `Внимание: допущен технический перерасход по материалу «${inv.name}» (дефицит ${deficitQty} ${inv.unit ?? "ед."}). Требуется пополнение склада.`;

			additionalTransactions.push({
				organizationId,
				visitId: visitId ?? null,
				itemId: inv.id,
				inventoryItemId: inv.id,
				batchId: null,
				warehouseId: warehouseId ?? null,
				qty: String(-deficitQty),
				quantityChanged: String(-deficitQty),
				unitCostRub: inv.unitCostRub ?? null,
				unitCostKopecks: resolvedDefaultCostKopecks,
				transactionType: "emergency_overdraft",
				isOverdraft: true,
				userId: userId ?? null,
				metadata: metadata ?? null,
				notes: notes ? `${notes} (дефицит ${deficitQty} ед.)` : `Технический перерасход при оказании помощи (дефицит ${deficitQty} ед.)`,
			});

			const safeUnit =
				inv.unit === "карпула" || inv.unit === "carpule"
					? "carpule"
					: inv.unit === "шприц_гр" || inv.unit === "gram"
						? "gram"
						: inv.unit === "ампула" || inv.unit === "dose"
							? "dose"
							: inv.unit === "упак" || inv.unit === "pack"
								? "pack"
								: "pcs";

			purchaseOrderDraft = generateSupplierPurchaseOrder({
				visitId: visitId ?? undefined,
				alerts: [
					{
						sku: inv.id,
						nameRu: inv.name,
						cabinetId: warehouseId || "main",
						previousQuantity: currentStock,
						remainingQuantity: -trueDeficit,
						minThresholdQuantity: 0,
						alertLevel: "critical_out_of_stock",
						messageRu: warning,
					},
				],
				requirements: [
					{
						sku: inv.id,
						nameRu: inv.name,
						category: "Расходные материалы",
						totalQuantityRequired: requiredQty,
						unitOfMeasure: safeUnit,
						totalEstimatedCostKopecks: 0,
						procedureBreakdown: [],
						isAvailableInStock: false,
						currentStockQuantity: currentStock,
						shortfallQuantity: trueDeficit,
					},
				],
			});
		}
	}

	return { additionalTransactions, isOverdraft, deficitQty, warning, purchaseOrderDraft };
}
