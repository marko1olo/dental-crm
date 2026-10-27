import type { AcceptanceWaybillDocument } from "../acceptanceWaybillsEngine.js";

export async function sendWaybillToApi(
	waybill: AcceptanceWaybillDocument,
	organizationId: string,
	inventoryItems: readonly { readonly id: string; readonly name: string; readonly stockQuantity: number | string }[],
	headers: Record<string, string>,
): Promise<boolean> {
	try {
		const payload = {
			supplierName: waybill.supplier.name.trim() || "Поставщик стоматологии",
			supplierInn: waybill.supplier.inn?.trim() || null,
			waybillNumber: waybill.waybillNumber.trim(),
			receiptDate: waybill.receiptDate,
			warehouseName: waybill.warehouseName || "Основной склад",
			items: waybill.items.map((it) => ({
				inventoryItemId: it.inventoryItemId || undefined,
				name: it.name.trim(),
				category: "material",
				unit: it.unit || "шт",
				batchNumber: it.batchNumber || `LOT-${new Date().getFullYear()}`,
				expirationDate: it.expirationDate || "2029-12-31",
				quantity: Number(it.quantity) || 1,
				purchasePriceKopecks: it.unitPriceKopecks,
				purchasePricePerUnit: it.unitPriceKopecks ? it.unitPriceKopecks / 100 : 0,
				vatRate: it.vatRate || 0,
			})),
		};

		const res = await fetch(`/api/inventory/${organizationId}/acceptance-waybill`, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});
		if (res.ok) return true;
	} catch (err) {
		console.warn("[AcceptanceWaybills] Попытка acceptance-waybill не удалась, fallback:", err);
	}

	for (const item of waybill.items) {
		const matching = inventoryItems.find((inv) => inv.name.toLowerCase().trim() === item.name.toLowerCase().trim());
		if (matching) {
			await fetch(`/api/inventory/${organizationId}/${matching.id}/stock`, {
				method: "PATCH",
				headers,
				body: JSON.stringify({
					adjustment: item.quantity,
					reason: `Оприходование накладной №${waybill.waybillNumber} (${waybill.supplier.name})`,
					lotNumber: item.batchNumber,
					expirationDate: item.expirationDate,
					allowOverdraft: true,
				}),
			});
		}
	}
	return false;
}
