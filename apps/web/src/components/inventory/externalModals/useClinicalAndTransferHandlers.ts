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

	return { handleClinicalWriteoff };
}
