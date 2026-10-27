import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders.js";
import type { AcceptanceWaybillDocument } from "../acceptanceWaybillsEngine.js";
import { reconcileOverdraftOnReceipt } from "../acceptanceWaybillsEngine.js";

export function reconcileOverdraftForWaybill(
	items: AcceptanceWaybillDocument["items"],
	inventoryItems: ReadonlyArray<{ name: string; stockQuantity: number | string }>,
): number {
	const overdraftItems = inventoryItems.filter((inv) => Number(inv.stockQuantity) < 0);
	let resolvedCount = 0;
	for (const wbItem of items) {
		const matching = overdraftItems.find((d) =>
			d.name.toLowerCase().includes(wbItem.name.toLowerCase().slice(0, 15)),
		);
		if (
			matching &&
			reconcileOverdraftOnReceipt(Number(matching.stockQuantity), wbItem.quantity).clearedDeficit > 0
		) {
			resolvedCount++;
		}
	}
	return resolvedCount;
}

export async function fetchWaybillsFromApi(organizationId: string): Promise<AcceptanceWaybillDocument[]> {
	try {
		const res = await fetch(`/api/inventory/${organizationId}/waybills`, {
			headers: getDenteAuthHeaders(),
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data.waybills)) return data.waybills;
		}
	} catch (err) {
		console.warn("[waybillPostingUtils] fetchWaybills error:", err);
	}
	return [];
}

export async function postWaybillToApi(waybill: AcceptanceWaybillDocument, organizationId?: string): Promise<void> {
	if (!organizationId) return;
	try {
		const payload = {
			supplierName: waybill.supplier.name,
			supplierInn: waybill.supplier.inn || null,
			waybillNumber: waybill.waybillNumber,
			receiptDate: waybill.receiptDate,
			warehouseName: waybill.warehouseName || "Основной склад",
			items: waybill.items.map((it) => ({
				inventoryItemId: it.inventoryItemId || undefined,
				name: it.name,
				unit: it.unit || "шт",
				batchNumber: it.batchNumber || `LOT-${new Date().getFullYear()}`,
				expirationDate: it.expirationDate || "2029-12-31",
				quantity: Number(it.quantity) || 1,
				purchasePricePerUnit: it.unitPriceKopecks ? it.unitPriceKopecks / 100 : 0,
			})),
		};
		await fetch(`/api/inventory/${organizationId}/acceptance-waybill`, {
			method: "POST",
			headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify(payload),
		});
	} catch (err) {
		console.warn("[waybillPostingUtils] postWaybill error:", err);
	}
}
