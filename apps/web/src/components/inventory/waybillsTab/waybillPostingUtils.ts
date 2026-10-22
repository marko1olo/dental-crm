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
