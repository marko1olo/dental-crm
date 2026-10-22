import { useCallback, useEffect, useState } from "react";
import { useInventoryStore } from "../../store/inventoryStore.js";
import { isDemoShowcaseMode } from "../../utils/demoModeEngine.js";
import { buildCanonicalFallbackWarehouseItems } from "./bomModules/materialBomTypes.js";
import {
	type InventoryItem,
	inventoryItemFromServer,
} from "./inventoryDataMappers.js";

export function useInventoryStockFetcher(
	effectiveOrgId: string,
	getHeaders: (extra?: Record<string, string>) => Record<string, string>,
) {
	const storeItems = useInventoryStore((s) => s.items);
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	// Synchronize local state with store updates
	useEffect(() => {
		if (storeItems.length > 0) {
			setItems((prev) => {
				const storeMap = new Map(storeItems.map((i) => [i.id, i]));
				return prev.map((item) => {
					const updated = storeMap.get(item.id);
					if (updated && updated.stockQuantity !== item.stockQuantity) {
						return { ...item, stockQuantity: updated.stockQuantity };
					}
					return item;
				});
			});
		}
	}, [storeItems]);

	const fetchItems = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch(`/api/inventory/${effectiveOrgId}`, {
				headers: getHeaders(),
			}).catch(() => null);
			const data = res && res.ok ? await res.json().catch(() => []) : [];
			const parsed = Array.isArray(data) ? data.map(inventoryItemFromServer) : [];
			const finalItems =
				parsed.length > 0
					? parsed
					: isDemoShowcaseMode()
						? buildCanonicalFallbackWarehouseItems()
						: [];
			setItems(finalItems);
			useInventoryStore.getState().setItems(
				finalItems.map((it) => ({
					id: it.id,
					name: it.name,
					sku: it.sku || null,
					barcode: it.barcode || null,
					stockQuantity: it.stockQuantity,
					criticalThreshold: it.criticalThreshold ?? 0,
					unitCostRub: typeof it.unitCostRub === "number" ? it.unitCostRub : parseFloat(String(it.unitCostRub)) || 0,
					lotNumber: it.lotNumber || null,
					expirationDate: it.expirationDate || null,
					isOverdraft: it.stockQuantity <= 0,
				})),
			);
			setLoadError(null);
		} catch (err: unknown) {
			setLoadError(
				err instanceof Error
					? err.message
					: "Не удалось загрузить остатки со склада",
			);
			setItems(isDemoShowcaseMode() ? buildCanonicalFallbackWarehouseItems() : []);
		} finally {
			setIsLoading(false);
		}
	}, [effectiveOrgId, getHeaders]);

	useEffect(() => {
		if (effectiveOrgId) {
			fetchItems();
			return;
		}
		setIsLoading(false);
	}, [effectiveOrgId, fetchItems]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleReload = () => {
			fetchItems();
		};
		window.addEventListener("dente-inventory-reload", handleReload);
		return () => window.removeEventListener("dente-inventory-reload", handleReload);
	}, [fetchItems]);

	return { items, setItems, isLoading, loadError, fetchItems };
}
