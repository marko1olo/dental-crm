import type { InventoryItem } from "../inventoryDataMappers.js";
import type { NormalizedRenderedService } from "./classBWasteTypes.js";

/**
 * Normalizes client rendered service items into standard 804n format.
 */
export function normalizeRenderedServices804n(
	rawServices: ReadonlyArray<{
		readonly serviceCode?: string | undefined;
		readonly code?: string | undefined;
		readonly name?: string | undefined;
		readonly serviceTitle?: string | undefined;
		readonly title?: string | undefined;
		readonly quantity?: number | undefined;
		readonly toothNumber?: number | string | null | undefined;
	}>,
): readonly NormalizedRenderedService[] {
	return rawServices.map((s, idx) => {
		const rawTooth = s.toothNumber;
		let toothNum: number | null = null;
		if (typeof rawTooth === "number" && rawTooth >= 11 && rawTooth <= 85) {
			toothNum = rawTooth;
		} else if (typeof rawTooth === "string" && /^\d{2}$/.test(rawTooth.trim())) {
			toothNum = parseInt(rawTooth.trim(), 10);
		}

		return {
			serviceCode: s.serviceCode || s.code || `SERV-804N-${idx + 1}`,
			serviceTitle: s.serviceTitle || s.name || s.title || "Оказанная стоматологическая услуга",
			quantity: typeof s.quantity === "number" && s.quantity > 0 ? s.quantity : 1,
			toothNumber: toothNum,
		};
	});
}

/**
 * Compiles a room/chair-scoped warehouse stock mapping.
 */
export function buildCabinetScopedStockMap(
	warehouseItems: readonly (InventoryItem & {
		readonly cabinetId?: string | undefined;
		readonly chairId?: string | undefined;
		readonly locationId?: string | undefined;
	})[] | undefined,
	currentStockMap: Record<string, number> | undefined,
	scope: {
		readonly chairId?: string | undefined;
		readonly cabinetId?: string | undefined;
	},
): Record<string, number> {
	const stockMap: Record<string, number> = {};

	if (warehouseItems) {
		for (const it of warehouseItems) {
			if (scope.chairId && it.chairId && it.chairId !== scope.chairId) continue;
			if (scope.cabinetId && it.cabinetId && it.cabinetId !== scope.cabinetId) continue;

			const qty = Number(it.stockQuantity ?? (it as any).quantity) || 0;
			if (it.id) {
				stockMap[it.id] = (stockMap[it.id] ?? 0) + qty;
			}
			if (it.name) {
				const n = it.name.toLowerCase().trim();
				stockMap[n] = (stockMap[n] ?? 0) + qty;
			}
		}
	}

	if (currentStockMap) {
		for (const [k, v] of Object.entries(currentStockMap)) {
			if (scope.cabinetId && k.startsWith(`${scope.cabinetId}:`)) {
				const bareKey = k.slice(scope.cabinetId.length + 1);
				stockMap[bareKey] = v;
			} else if (scope.chairId && k.startsWith(`${scope.chairId}:`)) {
				const bareKey = k.slice(scope.chairId.length + 1);
				stockMap[bareKey] = v;
			} else if (!stockMap[k] && !k.includes(":")) {
				stockMap[k] = v;
			}
		}
	}

	return stockMap;
}
