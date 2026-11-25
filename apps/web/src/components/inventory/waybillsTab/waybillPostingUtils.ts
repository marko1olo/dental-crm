import { generateUuidV7, kopecksToRubles } from "@dental/shared";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { showToast } from "../../GlobalToast.js";
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
		if (!res.ok) {
			clientLogger.warn(
				"[waybillPostingUtils] fetchWaybills HTTP error",
				{ status: res.status },
				{ module: "Inventory" },
			);
			return [];
		}
		const json = await res.json();
		const payload = json?.data ?? json;
		if (Array.isArray(payload?.waybills)) return payload.waybills;
	} catch (err) {
		clientLogger.warn("[waybillPostingUtils] fetchWaybills error", err, { module: "Inventory" });
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
				...(it.inventoryItemId ? { inventoryItemId: it.inventoryItemId } : {}),
				name: it.name,
				unit: it.unit || "шт",
				batchNumber: it.batchNumber || `LOT-${new Date().getFullYear()}`,
				expirationDate: it.expirationDate || "2029-12-31",
				quantity: Number(it.quantity) || 1,
				purchasePricePerUnit: it.unitPriceKopecks ? kopecksToRubles(it.unitPriceKopecks) : 0,
				...(it.unitPriceKopecks !== undefined ? { purchasePriceKopecks: it.unitPriceKopecks } : {}),
			})),
		};
		const res = await fetch(`/api/inventory/${organizationId}/acceptance-waybill`, {
			method: "POST",
			headers: getDenteAuthHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const errJson = await res.json().catch(() => ({}));
			const msg = errJson?.message || errJson?.error || `Ошибка проведения накладной (${res.status})`;
			clientLogger.warn("[waybillPostingUtils] postWaybill HTTP error", { status: res.status, msg }, { module: "Inventory" });
			showToast(msg, "error");
			throw new Error(msg);
		}
	} catch (err) {
		clientLogger.warn("[waybillPostingUtils] postWaybill error", err, { module: "Inventory" });
		throw err;
	}
}
