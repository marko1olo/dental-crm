import { useCallback, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { getItemCategoryType, matchesCategory, type MobileInventoryCategoryType } from "./types.js";

export function useMobileInventoryLogic(
	items: readonly InventoryItem[],
	organizationId: string,
	searchQuery: string,
	selectedCategory: MobileInventoryCategoryType,
	onQuickDeduct?: (item: InventoryItem, qty?: number) => void | Promise<void>,
	onReceiveItem?: (item: InventoryItem, qty?: number, lot?: string, exp?: string) => void | Promise<void>,
	onRefresh?: () => void,
) {
	const [isInboundDrawerOpen, setIsInboundDrawerOpen] = useState(false);
	const [drawerTargetItem, setDrawerTargetItem] = useState<InventoryItem | null>(null);
	const [drawerQuantity, setDrawerQuantity] = useState<number>(10);
	const [drawerLotNumber, setDrawerLotNumber] = useState<string>("");
	const [drawerExpDate, setDrawerExpDate] = useState<string>("");
	const [drawerCustomName, setDrawerCustomName] = useState<string>("");
	const [isSubmittingInbound, setIsSubmittingInbound] = useState(false);
	const [deductingItemIds, setDeductingItemIds] = useState<Record<string, boolean>>({});

	const triggerHaptic = useCallback(() => {
		try {
			if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(25);
		} catch { /* ignore */ }
	}, []);

	const categoryCounts = useMemo(() => {
		const counts: Record<MobileInventoryCategoryType, number> = {
			all: items.length, anesthesia: 0, filling: 0, endo: 0, impression: 0, ppe: 0,
		};
		for (const it of items) {
			const type = getItemCategoryType(it);
			if (type !== "all") counts[type]++;
		}
		return counts;
	}, [items]);

	const displayItems = useMemo(() => {
		let list = items.slice();
		if (selectedCategory !== "all") list = list.filter((it) => matchesCategory(it, selectedCategory));
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((it) => it.name.toLowerCase().includes(q) || Boolean(it.sku?.toLowerCase().includes(q)) || Boolean(it.barcode?.toLowerCase().includes(q)) || Boolean(it.lotNumber?.toLowerCase().includes(q)) || Boolean(it.category?.toLowerCase().includes(q)));
		}
		return list;
	}, [items, selectedCategory, searchQuery]);

	const lowStockCount = useMemo(() => items.filter((it) => it.stockQuantity <= (it.criticalThreshold || 0)).length, [items]);

	const handleExecuteQuickDeduct = async (e: React.MouseEvent, item: InventoryItem) => {
		e.stopPropagation();
		triggerHaptic();
		setDeductingItemIds((prev) => ({ ...prev, [item.id]: true }));
		try {
			if (onQuickDeduct) {
				await onQuickDeduct(item, 1);
			} else {
				const res = await fetch(`/api/inventory/${organizationId}/${item.id}/stock`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ adjustment: -1, allowOverdraft: true }),
				});
				if (res.ok) {
					const isDeficit = item.stockQuantity <= 1;
					showToast(isDeficit ? `Списано 1 ед. «${item.name}» (списание с дефицитом)` : `Списано 1 ед. «${item.name}»`, isDeficit ? "warning" : "success");
					if (onRefresh) onRefresh();
				} else {
					showToast("Ошибка списания со склада", "error");
				}
			}
		} catch {
			showToast("Сбой сети при списании", "error");
		} finally {
			setDeductingItemIds((prev) => ({ ...prev, [item.id]: false }));
		}
	};

	const handleOpenInboundDrawer = (item?: InventoryItem) => {
		triggerHaptic();
		if (item) {
			setDrawerTargetItem(item);
			setDrawerCustomName(item.name);
			setDrawerLotNumber(item.lotNumber || `ПАРТИЯ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`);
			setDrawerExpDate(item.expirationDate || "2027-12-31");
		} else {
			setDrawerTargetItem(null);
			setDrawerCustomName("");
			setDrawerLotNumber(`ПАРТИЯ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`);
			setDrawerExpDate("2027-12-31");
		}
		setDrawerQuantity(10);
		setIsInboundDrawerOpen(true);
	};

	return {
		isInboundDrawerOpen, setIsInboundDrawerOpen, drawerTargetItem, setDrawerTargetItem,
		drawerQuantity, setDrawerQuantity, drawerLotNumber, setDrawerLotNumber,
		drawerExpDate, setDrawerExpDate, drawerCustomName, setDrawerCustomName,
		isSubmittingInbound, setIsSubmittingInbound, deductingItemIds,
		triggerHaptic, categoryCounts, displayItems, lowStockCount,
		handleExecuteQuickDeduct, handleOpenInboundDrawer,
	};
}
