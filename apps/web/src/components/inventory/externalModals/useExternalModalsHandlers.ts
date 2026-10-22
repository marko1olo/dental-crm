import type { InventoryItem } from "../useInventoryLogic.js";
import { useClinicalAndTransferHandlers } from "./useClinicalAndTransferHandlers.js";
import { useAuditAndManagerWriteoffHandlers } from "./useAuditAndManagerWriteoffHandlers.js";

export function useExternalModalsHandlers(
	organizationId: string,
	items: readonly InventoryItem[],
	fetchItems: () => void,
	getHeaders: (headers?: Record<string, string>) => Record<string, string>,
) {
	const clinicalAndTransfer = useClinicalAndTransferHandlers(
		organizationId,
		items,
		fetchItems,
		getHeaders,
	);

	const auditAndManagerWriteoff = useAuditAndManagerWriteoffHandlers(
		organizationId,
		fetchItems,
		getHeaders,
	);

	return {
		...clinicalAndTransfer,
		...auditAndManagerWriteoff,
	};
}
