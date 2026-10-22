import React, { useRef, useState } from "react";
import { logger } from "../../../utils/logger.js";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface UseInventoryAdjustOperationsParams {
	readonly effectiveOrgId: string;
	readonly getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	readonly fetchItems: () => Promise<void>;
}

export function useInventoryAdjustOperations({
	effectiveOrgId,
	getHeaders,
	fetchItems,
}: UseInventoryAdjustOperationsParams) {
	const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
	const [adjustAmount, setAdjustAmount] = useState("");
	const [adjustType, setAdjustType] = useState<"in" | "out">("in");
	const isAdjustingStockRef = useRef(false);
	const [isAdjustingStock, setIsAdjustingStock] = useState(false);

	const handleAdjustStock = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!adjustingItem || !adjustAmount) return;

		const amount = parseInt(adjustAmount, 10);
		if (Number.isNaN(amount) || amount <= 0) return;
		if (isAdjustingStockRef.current) return;
		isAdjustingStockRef.current = true;
		setIsAdjustingStock(true);

		const adjustment = adjustType === "in" ? amount : -amount;

		try {
			const res = await fetch(
				`/api/inventory/${effectiveOrgId}/${adjustingItem.id}/stock`,
				{
					method: "PATCH",
					headers: getHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ adjustment, allowOverdraft: true }),
				},
			);

			if (res.ok) {
				const isDeficit =
					adjustType === "out" &&
					(adjustingItem.stockQuantity <= 0 || amount > adjustingItem.stockQuantity);
				setAdjustingItem(null);
				setAdjustAmount("");
				showToast(
					isDeficit
						? "Остаток 0: зафиксирован мягкий учет расхода при нехватке (списание с дефицитом: накладная в пути, проведение приёма не заблокировано)"
						: "Остаток изменён",
					isDeficit ? "warning" : "success",
				);
				fetchItems();
			} else {
				showToast("Ошибка изменения остатка", "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка", "error");
		} finally {
			isAdjustingStockRef.current = false;
			setIsAdjustingStock(false);
		}
	};

	return {
		adjustingItem, setAdjustingItem,
		adjustAmount, setAdjustAmount,
		adjustType, setAdjustType,
		isAdjustingStock,
		handleAdjustStock,
	};
}
