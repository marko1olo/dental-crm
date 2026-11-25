import { generateUuidV7 } from "@dental/shared";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { ClinicalWriteoffDocument } from "../writeoff/clinicalWriteoffEngine.js";

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
			let failedCount = 0;
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
							headers: getHeaders({
								"Content-Type": "application/json",
								"Idempotency-Key": generateUuidV7(),
							}),
							body: JSON.stringify({
								adjustment: -line.actualQuantity,
								allowOverdraft: true,
								reason: `Акт ${doc.actNumber}: ${line.nameRu}`,
							}),
						},
					);
					if (res.ok) {
						deductedCount++;
					} else {
						failedCount++;
						clientLogger.warn(
							"[useClinicalAndTransferHandlers] Stock adjustment failed for line",
							{ status: res.status, itemId: matchingItem.id },
							{ module: "Inventory" },
						);
					}
				}
			}
			if (failedCount > 0) {
				showToast(
					`Акт списания проведён частично (проведено ${deductedCount} поз., ошибок: ${failedCount})`,
					"error",
				);
			} else {
				showToast(
					`Акт списания зарегистрирован (проведено ${deductedCount} поз., мягкий овердрафт разрешен)`,
					"success",
				);
			}
		} catch (e) {
			clientLogger.error("[useClinicalAndTransferHandlers] Clinical writeoff failed", e, { module: "Inventory" });
			showToast("Ошибка при фиксации акта списания", "error");
		} finally {
			onClose();
			fetchItems();
		}
	};

	return { handleClinicalWriteoff };
}
