import { isDeductibleQuantity } from "@dental/shared";

export interface ManualDeductionInputItem {
	inventoryItemId: string;
	quantity: number;
	reason?: string | null | undefined;
}

export interface AggregatedManualItems {
	sortedIds: string[];
	requiredByItem: Map<string, number>;
	reasonsByItem: Map<string, string>;
}

export function aggregateManualDeductionItems(items?: ManualDeductionInputItem[]): AggregatedManualItems {
	const requiredByItem = new Map<string, number>();
	const reasonsByItem = new Map<string, string>();

	if (!items || items.length === 0) {
		return { sortedIds: [], requiredByItem, reasonsByItem };
	}

	for (const it of items) {
		if (!it.inventoryItemId) continue;
		const qty = Number(it.quantity);
		if (!isDeductibleQuantity(qty)) continue;
		const current = requiredByItem.get(it.inventoryItemId) ?? 0;
		requiredByItem.set(it.inventoryItemId, current + qty);
		if (it.reason) {
			reasonsByItem.set(it.inventoryItemId, it.reason);
		}
	}

	const sortedIds = Array.from(requiredByItem.keys()).sort();
	return { sortedIds, requiredByItem, reasonsByItem };
}
