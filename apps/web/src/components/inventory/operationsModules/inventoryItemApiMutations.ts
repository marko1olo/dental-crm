import { normalizeRubAmountInput } from "../../../rubAmountInput.js";
import { logger } from "../../../utils/logger.js";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface SaveInventoryItemParams {
	effectiveOrgId: string;
	getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	formData: {
		name: string;
		threshold: string;
		unitCostRub: string;
		sku: string;
		barcode: string;
		lotNumber: string;
		expirationDate: string;
	};
	editingItem: InventoryItem | null;
}

export async function saveInventoryItemApi({
	effectiveOrgId,
	getHeaders,
	formData,
	editingItem,
}: SaveInventoryItemParams): Promise<{ success: boolean; error?: string }> {
	const typedCost = formData.unitCostRub.trim();
	const parsedCost = typedCost ? normalizeRubAmountInput(typedCost) : 0;
	if (parsedCost === null) {
		return { success: false, error: "Цену укажите цифрами, копейки после запятой: 12,50" };
	}
	const threshold = Math.max(0, parseInt(formData.threshold, 10) || 0);

	try {
		const bodyData = {
			name: formData.name.trim(),
			criticalThreshold: threshold,
			unitCostRub: parsedCost,
			sku: formData.sku.trim() || null,
			barcode: formData.barcode.trim() || null,
			lotNumber: formData.lotNumber.trim() || null,
			expirationDate: formData.expirationDate.trim() || null,
		};
		const isEdit = Boolean(editingItem);
		const url = isEdit
			? `/api/inventory/${effectiveOrgId}/${editingItem!.id}`
			: `/api/inventory/${effectiveOrgId}`;
		const res = await fetch(url, {
			method: isEdit ? "PUT" : "POST",
			headers: getHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify(isEdit ? bodyData : { ...bodyData, stockQuantity: 0 }),
		});
		return { success: res.ok };
	} catch (e) {
		logger.error(e);
		return { success: false, error: "Системная ошибка" };
	}
}

export async function deleteInventoryItemApi(
	effectiveOrgId: string,
	itemId: string,
	getHeaders: (extra?: Record<string, string>) => Record<string, string>,
): Promise<boolean> {
	try {
		const res = await fetch(`/api/inventory/${effectiveOrgId}/${itemId}`, {
			method: "DELETE",
			headers: getHeaders(),
		});
		return res.ok;
	} catch (e) {
		logger.error(e);
		return false;
	}
}
