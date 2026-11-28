import { useCallback, useEffect, useState } from "react";
import {
	isPlainRecord,
	readApiErrorMessage,
	unwrapApiEnvelope,
} from "../../lib/apiResponseHandler.js";
import { clientLogger } from "../../services/logging/clientLogger.js";
import { useInventoryStore } from "../../store/inventoryStore.js";
import { isDemoShowcaseMode } from "../../utils/demoModeEngine.js";
import { showToast } from "../GlobalToast.js";
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
			setLoadError(null);
			const res = await fetch(`/api/inventory/${effectiveOrgId}`, {
				headers: getHeaders(),
			});
			if (!res.ok) {
				const errMsg = await readApiErrorMessage(
					res,
					`Ошибка загрузки склада (${res.status})`,
				);
				throw new Error(errMsg);
			}
			const rawJson: unknown = await res.json();
			const unwrapped = unwrapApiEnvelope(rawJson);
			const listCandidate = Array.isArray(unwrapped)
				? unwrapped
				: isPlainRecord(unwrapped) && Array.isArray(unwrapped.items)
					? unwrapped.items
					: null;
			if (!listCandidate) {
				throw new Error("Сервер вернул некорректный формат остатков склада");
			}
			const parsed = listCandidate.map(inventoryItemFromServer);
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
			const msg =
				err instanceof Error
					? err.message
					: "Не удалось загрузить остатки со склада";
			clientLogger.warn("[useInventoryStockFetcher] Ошибка загрузки остатков склада", err, {
				module: "Inventory",
			});
			setLoadError(msg);
			if (isDemoShowcaseMode()) {
				setItems(buildCanonicalFallbackWarehouseItems());
			} else {
				showToast(msg, "error");
			}
		} finally {
			setIsLoading(false);
		}
	}, [effectiveOrgId, getHeaders]);

	useEffect(() => {
		if (effectiveOrgId) {
			void fetchItems();
			return;
		}
		setIsLoading(false);
	}, [effectiveOrgId, fetchItems]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleReload = () => {
			void fetchItems();
		};
		window.addEventListener("dente-inventory-reload", handleReload);
		return () => window.removeEventListener("dente-inventory-reload", handleReload);
	}, [fetchItems]);

	return { items, setItems, isLoading, loadError, fetchItems };
}
