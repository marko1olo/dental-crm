import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";

export function useInventoryTableState(
	items: readonly InventoryItem[],
	externalSearchQuery?: string,
	onDeductItem?: ((item: InventoryItem, quantity?: number) => void | Promise<void>) | undefined,
	onReceiveItem?: ((item: InventoryItem, quantity?: number) => void | Promise<void>) | undefined,
	onCreateDisposalAct?: ((item: InventoryItem) => void | Promise<void>) | undefined,
) {
	const [localSearchQuery, setLocalSearchQuery] = useState("");
	const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
	const [disposalPromptItem, setDisposalPromptItem] = useState<InventoryItem | null>(null);
	const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
	const rowMenuRef = useRef<HTMLDivElement>(null);

	const effectiveSearch = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
				setActiveMenuRowId(null);
			}
		};
		if (activeMenuRowId) {
			document.addEventListener("mousedown", handleOutside);
		}
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [activeMenuRowId]);

	const handleStepQuantity = useCallback((itemId: string, delta: number) => {
		setPendingQuantities((prev) => {
			const current = prev[itemId] || 1;
			const nextVal = Math.max(1, current + delta);
			return { ...prev, [itemId]: nextVal };
		});
	}, []);

	const handleChangeQuantity = useCallback((itemId: string, val: number) => {
		setPendingQuantities((prev) => ({ ...prev, [itemId]: Math.max(1, val) }));
	}, []);

	const filteredItems = useMemo(() => {
		if (!effectiveSearch || !effectiveSearch.trim()) return items;
		const query = effectiveSearch.toLowerCase().trim();
		return items.filter(
			(item) =>
				item.name.toLowerCase().includes(query) ||
				(item.sku && item.sku.toLowerCase().includes(query)) ||
				(item.barcode && item.barcode.toLowerCase().includes(query)) ||
				(item.lotNumber && item.lotNumber.toLowerCase().includes(query)),
		);
	}, [items, effectiveSearch]);

	const handleExecuteDisposalAct = (item: InventoryItem) => {
		const actNumber = `САНПИН-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
		if (onCreateDisposalAct) {
			onCreateDisposalAct(item);
		} else {
			showToast(
				`Оформлен акт утилизации ${actNumber} по СанПиН 3.3686-21 для «${item.name}» (Класс Б/Г). Партия списана.`,
				"info",
			);
		}
		setDisposalPromptItem(null);
	};

	const handleExecuteDeduct = (item: InventoryItem, qty: number, isOverdraft: boolean) => {
		if (onDeductItem) {
			onDeductItem(item, qty);
		} else {
			showToast(
				isOverdraft
					? `Списано ${qty} ед. «${item.name}» (расход сверх остатка / списание с дефицитом)`
					: `Списано ${qty} ед. «${item.name}» по FEFO`,
				isOverdraft ? "info" : "success",
			);
		}
	};

	const handleExecuteReceive = (item: InventoryItem, qty: number) => {
		if (onReceiveItem) {
			onReceiveItem(item, qty);
		} else {
			showToast(`Оприходовано ${qty} ед. «${item.name}» на склад`, "success");
		}
	};

	return {
		effectiveSearch,
		setLocalSearchQuery,
		activeMenuRowId,
		setActiveMenuRowId,
		disposalPromptItem,
		setDisposalPromptItem,
		pendingQuantities,
		rowMenuRef,
		handleStepQuantity,
		handleChangeQuantity,
		filteredItems,
		handleExecuteDisposalAct,
		handleExecuteDeduct,
		handleExecuteReceive,
	};
}
