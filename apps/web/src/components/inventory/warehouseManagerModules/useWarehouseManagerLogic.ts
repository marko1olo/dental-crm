import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { type InventoryItem, inventoryItemFromServer } from "../inventoryDataMappers.js";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { CANONICAL_WAREHOUSE_PRESETS, DEFAULT_WAREHOUSE_ITEMS } from "./warehouseManagerPresets.js";
import type { WarehouseWriteoffItem } from "./types.js";

function resolveCategory(name: string): string {
	const l = name.toLowerCase();
	if (l.includes("артикаин") || l.includes("мепивакаин") || l.includes("скандонест") || l.includes("игла")) return "Анестезия";
	if (l.includes("перчатки") || l.includes("маска") || l.includes("слюноотсос") || l.includes("салфетка")) return "СИЗ";
	if (l.includes("композит") || l.includes("адгезив") || l.includes("микроаппликатор")) return "Терапия";
	if (l.includes("крафт") || l.includes("индикатор")) return "Стерилизация";
	if (l.includes("порошок") || l.includes("паста") || l.includes("оптрагейт") || l.includes("щетка")) return "Гигиена";
	return "Расходные";
}

export function useWarehouseManagerLogic(isOpen: boolean, initialItems?: readonly InventoryItem[], organizationId?: string) {
	const demoMode = isDemoShowcaseMode();
	const [fetchedItems, setFetchedItems] = useState<readonly InventoryItem[]>([]);
	const [isLoadingStock, setIsLoadingStock] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [writeoffQuantities, setWriteoffQuantities] = useState<Record<string, number>>({});
	const [activeView, setActiveView] = useState<"inventory" | "act_preview">("inventory");
	const [displayLimit, setDisplayLimit] = useState(40);

	const fetchLiveStock = useCallback(() => {
		if (demoMode || (initialItems && initialItems.length > 0)) return;
		setIsLoadingStock(true);
		fetch(organizationId ? `/api/inventory/${organizationId}` : "/api/inventory")
			.then((res) => (res.ok ? res.json() : []))
			.then((data) => { if (Array.isArray(data)) setFetchedItems(data.map(inventoryItemFromServer)); })
			.catch(() => setFetchedItems([]))
			.finally(() => setIsLoadingStock(false));
	}, [demoMode, initialItems, organizationId]);

	useEffect(() => { if (isOpen) fetchLiveStock(); }, [isOpen, fetchLiveStock]);
	useEffect(() => { setDisplayLimit(40); }, [searchQuery, categoryFilter]);

	const rawItems = useMemo(() => (initialItems?.length ? initialItems : demoMode ? DEFAULT_WAREHOUSE_ITEMS : fetchedItems), [initialItems, demoMode, fetchedItems]);
	const itemsWithCategory = useMemo(() => rawItems.map((item) => ({ ...item, category: resolveCategory(item.name), unit: item.unit || item.unitOfMeasure || "шт." })), [rawItems]);

	const filteredItems = useMemo(() => itemsWithCategory.filter((item) => {
		const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || Boolean(item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
		return matchesSearch && (categoryFilter === "all" || item.category === categoryFilter);
	}), [itemsWithCategory, searchQuery, categoryFilter]);

	const itemsSlice = useMemo(() => sliceDomList(filteredItems, displayLimit, 0), [filteredItems, displayLimit]);

	const activeWriteoffLines = useMemo((): WarehouseWriteoffItem[] => {
		const lines: WarehouseWriteoffItem[] = [];
		for (const item of itemsWithCategory) {
			const qty = writeoffQuantities[item.id] || 0;
			if (qty > 0) {
				lines.push({
					id: item.id, name: item.name, category: item.category, unit: item.unit,
					stockQuantity: item.stockQuantity, writeoffQuantity: qty, unitCostRub: item.unitCostRub,
					isOverdraft: item.stockQuantity <= 0 || qty > item.stockQuantity,
					lotNumber: item.lotNumber, expirationDate: item.expirationDate,
				});
			}
		}
		return lines;
	}, [itemsWithCategory, writeoffQuantities]);

	const totalWriteoffCostRub = useMemo(() => activeWriteoffLines.reduce((acc, l) => acc + (Number.parseFloat(l.unitCostRub) || 0) * l.writeoffQuantity, 0), [activeWriteoffLines]);

	const handleApplyPreset = useCallback((presetId: string) => {
		const preset = CANONICAL_WAREHOUSE_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setWriteoffQuantities((prev) => {
			const next = { ...prev };
			for (const pItem of preset.items) {
				const matched = itemsWithCategory.find((i) => i.name.toLowerCase().includes(pItem.name.toLowerCase().slice(0, 15)));
				if (matched) next[matched.id] = (next[matched.id] || 0) + pItem.qty;
			}
			return next;
		});
		showToast(`Пресет «${preset.name}» применен`, "info");
	}, [itemsWithCategory]);

	const handleStepQuantity = useCallback((itemId: string, delta: number) => {
		setWriteoffQuantities((prev) => {
			const nextVal = Math.max(0, Number(((prev[itemId] || 0) + delta).toFixed(2)));
			if (nextVal === 0) { const copy = { ...prev }; delete copy[itemId]; return copy; }
			return { ...prev, [itemId]: nextVal };
		});
	}, []);

	return {
		rawItems, filteredItems, itemsSlice, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter,
		activeView, setActiveView, setDisplayLimit, writeoffQuantities, activeWriteoffLines,
		hasActiveOverdraft: activeWriteoffLines.some((l) => l.isOverdraft), totalWriteoffCostRub,
		isLoadingStock, fetchLiveStock, handleApplyPreset, handleStepQuantity,
		handleClearAll: useCallback(() => { setWriteoffQuantities({}); showToast("Очередь списания очищена", "info"); }, []),
	};
}
