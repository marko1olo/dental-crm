import {
	useInventoryItemFormOperations,
	type UseInventoryItemFormOperationsParams,
} from "./operationsModules/useInventoryItemFormOperations.js";
import { useInventoryAdjustOperations } from "./operationsModules/useInventoryAdjustOperations.js";

export type UseInventoryOperationsParams = UseInventoryItemFormOperationsParams;

export function useInventoryOperations(params: UseInventoryOperationsParams) {
	const itemFormOps = useInventoryItemFormOperations(params);
	const adjustOps = useInventoryAdjustOperations({
		effectiveOrgId: params.effectiveOrgId,
		getHeaders: params.getHeaders,
		fetchItems: params.fetchItems,
	});

	return {
		...itemFormOps,
		...adjustOps,
	};
}
