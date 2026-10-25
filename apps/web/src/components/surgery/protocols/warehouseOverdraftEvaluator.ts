/**
 * warehouseOverdraftEvaluator.ts — Проверка мягкого овердрафта склада (Мандат 8e).
 */

import type { SurgicalWarehouseOverdraftStatus } from "../surgeryNormsCatalog";

export function evaluateWarehouseOverdraft(
	materials: readonly { name: string; isWarehouseCritical?: boolean }[],
	forceWarehouseDelay = false,
	specificDelayedItems?: readonly string[],
): SurgicalWarehouseOverdraftStatus {
	const pending =
		specificDelayedItems && specificDelayedItems.length > 0
			? [...specificDelayedItems]
			: forceWarehouseDelay
				? materials.map((m) => m.name)
				: [];

	if (pending.length > 0) {
		return {
			hasOverdraft: true,
			warningRu: "Задержка оприходования накладной склада",
			detailsRu:
				`Компоненты (${pending.join(", ")}) ещё не проведены во входящей накладной. ` +
				"Операция не блокируется: списание зафиксировано в мягкий овердрафт с уведомлением старшей медсестры.",
			pendingItems: pending,
			canProceed: true,
		};
	}

	return {
		hasOverdraft: false,
		warningRu: "Складской учет в норме",
		detailsRu: "Все компоненты и стерильные расходники списаны штатно со склада кабинета.",
		pendingItems: [],
		canProceed: true,
	};
}

export interface SurgicalMaterialDeductionResult {
	readonly success: boolean;
	readonly isOverdraft: boolean;
	readonly deductedItems: readonly {
		readonly name: string;
		readonly unit: string;
		readonly quantity: number;
		readonly isOverdraft: boolean;
	}[];
	readonly messageRu: string;
}
