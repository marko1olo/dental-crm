import { generateUuidV7 } from "@dental/shared";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { showToast } from "../../GlobalToast.js";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";

export interface WarehouseWriteoffItem {
	readonly id: string;
	readonly name: string;
	readonly writeoffQuantity: number;
	readonly unitCostRub?: number | string | undefined;
}

export function useAuditAndManagerWriteoffHandlers(
	organizationId: string,
	fetchItems: () => void,
	getHeaders: (headers?: Record<string, string>) => Record<string, string>,
) {
	const handleInventoryAudit = async (
		doc: WarehouseInventoryAuditDocument,
		onClose: () => void,
	) => {
		try {
			const discrepancyItems = doc.items.filter((it) => it.discrepancyQuantity !== 0);
			if (discrepancyItems.length > 0) {
				const res = await fetch(`/api/inventory/${organizationId}/stock/batch-adjust`, {
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						reason: `Инвентаризация ${doc.documentNumber}`,
						items: discrepancyItems.map((it) => ({
							itemId: it.itemId,
							adjustment: it.discrepancyQuantity,
						})),
					}),
				});
				if (!res.ok) {
					let rawJson: { data?: { message?: string; error?: string }; message?: string; error?: string } | null = null;
					try {
						rawJson = (await res.json()) as {
							data?: { message?: string; error?: string };
							message?: string;
							error?: string;
						} | null;
					} catch (parseErr) {
						clientLogger.warn("[useAuditAndManagerWriteoffHandlers] Audit error JSON parse failed", {
							status: res.status,
							error: String(parseErr),
						}, { module: "Inventory" });
					}
					const errPayload = rawJson?.data ?? rawJson;
					throw new Error(errPayload?.message || errPayload?.error || `Ошибка корректировки остатков (${res.status})`);
				}
				let okJson: { data?: unknown } | null = null;
				try {
					okJson = (await res.json()) as { data?: unknown } | null;
				} catch (parseErr) {
					clientLogger.warn("[useAuditAndManagerWriteoffHandlers] Audit response JSON parse failed", {
						error: String(parseErr),
					}, { module: "Inventory" });
				}
				const _okPayload = okJson?.data ?? okJson;
				void _okPayload;
				showToast(`Инвентаризация утверждена: скорректировано ${discrepancyItems.length} позиций на складе`, "info");
			} else {
				showToast("Инвентаризация утверждена: расхождений по остаткам не выявлено", "info");
			}
		} catch (err) {
			clientLogger.error("[useAuditAndManagerWriteoffHandlers] Inventory audit failed", err, { module: "Inventory" });
			const message = err instanceof Error ? err.message : "Не удалось провести списание/оприходование по инвентаризации";
			showToast(message, "error");
		} finally {
			onClose();
			fetchItems();
		}
	};

	const handleWarehouseManagerWriteoff = async (
		writeoffLines: readonly WarehouseWriteoffItem[],
		onClose: () => void,
	) => {
		try {
			const res = await fetch(`/api/inventory/${organizationId}/deduct`, {
				method: "POST",
				headers: getHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					organizationId,
					items: (writeoffLines || []).map((line) => ({
						id: line.id,
						inventoryItemId: line.id,
						name: line.name,
						quantity: line.writeoffQuantity,
						unitCostRub: line.unitCostRub,
						allowOverdraft: true,
						reason: `Ручное списание: ${line.name}`,
					})),
					reason: "Ручное списание со склада",
					allowOverdraft: true,
				}),
			});
			if (!res.ok) {
				let errData: { message?: string } = {};
				try {
					errData = (await res.json()) as { message?: string };
				} catch (parseErr) {
					clientLogger.warn("[useAuditAndManagerWriteoffHandlers] Writeoff error JSON parse failed", {
						status: res.status,
						error: String(parseErr),
					}, { module: "Inventory" });
				}
				throw new Error(errData.message || `Ошибка списания (${res.status})`);
			}
			showToast(`Списание материалов успешно проведено (${writeoffLines?.length ?? 0} поз.)`, "success");
		} catch (e) {
			clientLogger.error("[useAuditAndManagerWriteoffHandlers] Manager writeoff failed", e, { module: "Inventory" });
			showToast(e instanceof Error ? e.message : "Не удалось провести списание материалов на сервере", "error");
		} finally {
			onClose();
			fetchItems();
		}
	};

	return { handleInventoryAudit, handleWarehouseManagerWriteoff };
}
