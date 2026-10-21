import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { ClinicalWriteoffDocument } from "../writeoff/clinicalWriteoffEngine.js";
import type { WarehouseTransferDocument } from "../transfers/warehouseTransferEngine.js";
import type { WarehouseWriteoffItem } from "../warehouseManagerModules/types.js";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";

export function useExternalModalsHandlers(
	organizationId: string,
	items: readonly InventoryItem[],
	fetchItems: () => void,
	getHeaders: (headers?: Record<string, string>) => Record<string, string>,
) {
	const handleClinicalWriteoff = async (
		doc: ClinicalWriteoffDocument,
		onClose: () => void,
	) => {
		try {
			let deductedCount = 0;
			for (const line of doc.lines) {
				if (line.actualQuantity <= 0) continue;
				const matchingItem = items.find(
					(it) => it.name.toLowerCase() === line.nameRu.toLowerCase(),
				);
				if (matchingItem) {
					const res = await fetch(
						`/api/inventory/${organizationId}/${matchingItem.id}/stock`,
						{
							method: "PATCH",
							headers: getHeaders({ "Content-Type": "application/json" }),
							body: JSON.stringify({
								adjustment: -line.actualQuantity,
								allowOverdraft: true,
								reason: `Акт ${doc.actNumber}: ${line.nameRu}`,
							}),
						},
					);
					if (res.ok) deductedCount++;
				}
			}
			showToast(
				`Акт списания зарегистрирован (проведено ${deductedCount} поз., мягкий овердрафт разрешен)`,
				"success",
			);
		} catch (e) {
			console.error(e);
			showToast("Ошибка при фиксации акта списания", "error");
		} finally {
			onClose();
			fetchItems();
		}
	};

	const handleWarehouseTransfer = async (
		doc: WarehouseTransferDocument,
	) => {
		if (!doc || !doc.items || doc.items.length === 0) return;
		try {
			const headers = getHeaders({ "Content-Type": "application/json" });
			const deductItems = doc.items
				.filter((line) => (line.dispatchedQuantity ?? line.requestedQuantity ?? 0) > 0)
				.map((line) => {
					const matchingItem = items.find(
						(it) => it.id === line.itemId || it.name.trim().toLowerCase() === line.nameRu.trim().toLowerCase(),
					);
					return {
						inventoryItemId: matchingItem?.id || line.itemId,
						name: line.nameRu,
						quantity: line.dispatchedQuantity > 0 ? line.dispatchedQuantity : line.requestedQuantity,
						allowOverdraft: true,
						reason: `Перемещение ТОРГ-13 №${doc.documentNumber} (${doc.sourceBranchId} → ${doc.targetBranchId})`,
						notes: doc.notes,
						lotNumber: line.batchNumber,
						expirationDate: line.expiryDate,
					};
				});

			if (deductItems.length > 0) {
				await fetch(`/api/inventory/${organizationId}/deduct`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						items: deductItems,
						allowOverdraft: true,
						reason: `Перемещение ТОРГ-13 №${doc.documentNumber}`,
						notes: doc.notes,
					}),
				});
			}
		} catch (err) {
			console.error("Ошибка списания при перемещении со склада:", err);
		} finally {
			fetchItems();
		}
	};

	const handleInventoryAudit = async (
		doc: WarehouseInventoryAuditDocument,
		onClose: () => void,
	) => {
		try {
			const discrepancyItems = doc.items.filter((it) => it.discrepancyQuantity !== 0);
			if (discrepancyItems.length > 0) {
				const headers = getHeaders({ "Content-Type": "application/json" });
				for (const it of discrepancyItems) {
					await fetch(`/api/inventory/${organizationId}/${it.itemId}/stock`, {
						method: "PATCH",
						headers,
						body: JSON.stringify({
							adjustment: it.discrepancyQuantity,
							reason: `Инвентаризация ${doc.documentNumber} (${it.discrepancyQuantity > 0 ? "излишек" : "недостача"})`,
							allowOverdraft: true,
						}),
					});
				}
				showToast(`Инвентаризация утверждена: скорректировано ${discrepancyItems.length} позиций на складе`, "info");
			} else {
				showToast("Инвентаризация утверждена: расхождений по остаткам не выявлено", "info");
			}
		} catch (err) {
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
				headers: getHeaders({ "Content-Type": "application/json" }),
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
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || `Ошибка списания (${res.status})`);
			}
			showToast(`Списание материалов успешно проведено (${writeoffLines?.length ?? 0} поз.)`, "success");
		} catch (e) {
			console.error(e);
			showToast(e instanceof Error ? e.message : "Не удалось провести списание материалов на сервере", "error");
		} finally {
			onClose();
			fetchItems();
		}
	};

	return {
		handleClinicalWriteoff,
		handleWarehouseTransfer,
		handleInventoryAudit,
		handleWarehouseManagerWriteoff,
	};
}
