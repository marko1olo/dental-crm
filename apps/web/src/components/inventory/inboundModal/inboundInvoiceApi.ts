import type { InventoryItem } from "../useInventoryLogic.js";
import type { InboundInvoiceItemLine } from "./InboundInvoiceTypes.js";

export interface PostInboundInvoiceParams {
	organizationId: string;
	invoiceNumber: string;
	invoiceDate: string;
	supplierName: string;
	lines: readonly InboundInvoiceItemLine[];
	inventoryItems: readonly InventoryItem[];
	headers: Record<string, string>;
}

/**
 * Промышленный шлюз оприходования накладной поставщика (Мандаты 8e, 8n).
 * 1. Атомарное оприходование партий FEFO через acceptance-waybill.
 * 2. Резервный построчный контур пополнения с мягким овердрафтом (Soft Negative Stock).
 */
export async function postInboundInvoice(params: PostInboundInvoiceParams): Promise<number> {
	const { organizationId, invoiceNumber, invoiceDate, supplierName, lines, inventoryItems, headers } = params;
	let updatedCount = 0;
	let waybillSucceeded = false;

	// 1. Попытка атомарного оприходования через промышленный шлюз acceptance-waybill
	try {
		const waybillPayload = {
			supplierName: supplierName.trim() || "Основной поставщик",
			supplierInn: null,
			waybillNumber: invoiceNumber.trim() || `ПН-${Date.now().toString().slice(-6)}`,
			receiptDate: invoiceDate || new Date().toISOString().slice(0, 10),
			items: lines.map((line) => ({
				inventoryItemId: line.inventoryItemId || undefined,
				name: line.name.trim(),
				category: "Расходные материалы",
				unit: line.unit || "шт",
				batchNumber: line.lotNumber?.trim() || `П-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
				lotNumber: line.lotNumber?.trim() || undefined,
				expirationDate: line.expirationDate?.trim() || "2029-12-31",
				quantity: Number(line.quantity),
				purchasePricePerUnit: Number(line.unitCostRub || 0),
			})),
		};

		const res = await fetch(`/api/inventory/${organizationId}/acceptance-waybill`, {
			method: "POST",
			headers,
			body: JSON.stringify(waybillPayload),
		});

		if (res.ok) {
			waybillSucceeded = true;
			updatedCount = lines.length;
		}
	} catch (wbErr) {
		console.warn("[InboundInvoiceApi] Ошибка acceptance-waybill, откат к построчному режиму:", wbErr);
	}

	// 2. Резервный построчный контур при отсутствии acceptance-waybill
	if (!waybillSucceeded) {
		for (const line of lines) {
			let targetItemId = line.inventoryItemId;
			if (!targetItemId) {
				const found = inventoryItems.find((it) => it.name.trim().toLowerCase() === line.name.trim().toLowerCase());
				if (found) targetItemId = found.id;
			}

			if (targetItemId) {
				const res = await fetch(`/api/inventory/${organizationId}/${targetItemId}/stock`, {
					method: "PATCH",
					headers,
					body: JSON.stringify({
						adjustment: line.quantity,
						allowOverdraft: true,
						lotNumber: line.lotNumber || undefined,
						batchNumber: line.lotNumber || undefined,
						expirationDate: line.expirationDate || undefined,
						purchasePricePerUnit: line.unitCostRub || undefined,
						reason: `Приходная накладная ${invoiceNumber} от ${supplierName} (партия ${line.lotNumber})`,
					}),
				});
				if (res.ok) updatedCount++;
			} else {
				const res = await fetch(`/api/inventory/${organizationId}/items`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						name: line.name,
						stockQuantity: line.quantity,
						unit: line.unit,
						unitCostRub: String(line.unitCostRub),
						lotNumber: line.lotNumber,
						expirationDate: line.expirationDate,
						threshold: 0,
						allowOverdraft: true,
					}),
				});
				if (res.ok) updatedCount++;
			}
		}
	}

	return updatedCount;
}
