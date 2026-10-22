import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { ClinicalWriteoffDocument } from "../writeoff/clinicalWriteoffEngine.js";
import type { WarehouseTransferDocument } from "../transfers/warehouseTransferEngine.js";

export function useClinicalAndTransferHandlers(
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

	return { handleClinicalWriteoff, handleWarehouseTransfer };
}
