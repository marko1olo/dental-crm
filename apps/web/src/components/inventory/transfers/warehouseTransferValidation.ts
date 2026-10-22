import {
	getWarehouseBranch,
	type WarehouseBranchId,
} from "./warehouseTransferPresets.js";
import type { WarehouseTransferLineItem } from "./warehouseTransferTypes.js";

export function validateTransferDraft(
	sourceBranchId: WarehouseBranchId,
	targetBranchId: WarehouseBranchId,
	items: readonly WarehouseTransferLineItem[],
	stockByBranch?: Record<WarehouseBranchId, Record<string, number>> | undefined,
	allowOverdraft = false,
): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (sourceBranchId === targetBranchId) {
		errors.push("Склад-отправитель и склад-получатель не могут совпадать.");
	}

	if (!items || items.length === 0) {
		errors.push("Накладная перемещения должна содержать хотя бы одну товарную позицию.");
	}

	const now = new Date().toISOString().slice(0, 10);

	for (const item of items) {
		if (item.requestedQuantity <= 0 && item.dispatchedQuantity <= 0) {
			errors.push(`Товар «${item.nameRu}» имеет нулевое или отрицательное количество.`);
		}

		if (!item.batchNumber || item.batchNumber.trim().length === 0) {
			warnings.push(`Для товара «${item.nameRu}» не указан номер производственной серии (LOT).`);
		}

		if (item.expiryDate && item.expiryDate < now) {
			errors.push(`Срок годности товара «${item.nameRu}» истек (${item.expiryDate}). Перемещение просроченных ТМЦ запрещено!`);
		}

		if (stockByBranch && stockByBranch[sourceBranchId]) {
			const currentStock = stockByBranch[sourceBranchId]?.[item.itemId] ?? 0;
			const requiredQty = item.dispatchedQuantity > 0 ? item.dispatchedQuantity : item.requestedQuantity;
			if (requiredQty > currentStock) {
				if (allowOverdraft) {
					warnings.push(`Внимание: перемещение в овердрафт товара «${item.nameRu}» на складе ${getWarehouseBranch(sourceBranchId).nameRu}: требуется ${requiredQty}, в наличии ${currentStock}. Будет списано при поступлении накладной.`);
				} else {
					errors.push(`Недостаточно остатка товара «${item.nameRu}» на складе ${getWarehouseBranch(sourceBranchId).nameRu}: требуется ${requiredQty}, доступно ${currentStock}.`);
				}
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}
