import type { InventoryItem } from "../useInventoryLogic.js";
import type { InboundWaybillLine } from "./inboundWaybillTypes.js";

export async function submitInboundWaybill(params: {
	organizationId: string;
	waybillNumber: string;
	supplierName: string;
	receiptDate: string;
	warehouseName: string;
	lines: InboundWaybillLine[];
	inventoryItems: readonly InventoryItem[];
	headers: Record<string, string>;
}): Promise<void> {
	const { organizationId, waybillNumber, supplierName, receiptDate, warehouseName, lines, inventoryItems, headers } = params;

	const payload = {
		waybillNumber,
		supplierName,
		receiptDate,
		warehouseName,
		items: lines.map((l) => ({
			inventoryItemId: l.inventoryItemId,
			name: l.name.trim(),
			quantity: Number(l.quantity) || 1,
			unitCostRub: Number(l.unitCostRub) || 0,
			batchNumber: l.lotNumber || `LOT-${new Date().getFullYear()}`,
			expirationDate: l.expirationDate || "2028-12-31",
			unit: l.unit || "уп",
		})),
	};

	const res = await fetch(`/api/inventory/${organizationId}/acceptance-waybill`, {
		method: "POST",
		headers,
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		for (const line of lines) {
			const matchingItem = inventoryItems.find((inv) => inv.name.toLowerCase().trim() === line.name.toLowerCase().trim());
			if (matchingItem) {
				await fetch(`/api/inventory/${organizationId}/${matchingItem.id}/stock`, {
					method: "PATCH",
					headers,
					body: JSON.stringify({
						adjustment: Number(line.quantity) || 1,
						reason: `Оприходование накладной №${waybillNumber} (${supplierName})`,
						lotNumber: line.lotNumber,
						expirationDate: line.expirationDate,
						allowOverdraft: true,
					}),
				});
			}
		}
	}
}
