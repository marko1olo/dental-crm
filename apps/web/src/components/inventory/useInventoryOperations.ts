import React, { useRef, useState } from "react";
import { normalizeRubAmountInput } from "../../rubAmountInput.js";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";
import type { InventoryItem } from "./inventoryDataMappers.js";

export interface UseInventoryOperationsParams {
	readonly effectiveOrgId: string;
	readonly getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	readonly fetchItems: () => Promise<void>;
	readonly setConfirmDialog: (
		dialog: {
			isOpen: boolean;
			title: string;
			message: string;
			onConfirm: () => void;
		} | null,
	) => void;
}

export function useInventoryOperations({
	effectiveOrgId,
	getHeaders,
	fetchItems,
	setConfirmDialog,
}: UseInventoryOperationsParams) {
	// Add/Edit Modal
	const [showModal, setShowModal] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		threshold: "",
		unitCostRub: "",
		sku: "",
		barcode: "",
		lotNumber: "",
		expirationDate: "",
	});

	// Adjust Modal
	const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
	const [adjustAmount, setAdjustAmount] = useState("");
	const [adjustType, setAdjustType] = useState<"in" | "out">("in");
	const isAdjustingStockRef = useRef(false);
	const [isAdjustingStock, setIsAdjustingStock] = useState(false);
	const isSavingItemRef = useRef(false);
	const [isSavingItem, setIsSavingItem] = useState(false);

	const openAddModal = () => {
		setEditingItem(null);
		setFormData({
			name: "",
			threshold: "",
			unitCostRub: "",
			sku: "",
			barcode: "",
			lotNumber: "",
			expirationDate: "",
		});
		setShowModal(true);
	};

	const openEditModal = (item: InventoryItem) => {
		setEditingItem(item);
		setFormData({
			name: item.name,
			threshold: String(item.criticalThreshold),
			unitCostRub: item.unitCostRub ?? "",
			sku: item.sku || "",
			barcode: item.barcode || "",
			lotNumber: item.lotNumber || "",
			expirationDate: item.expirationDate || "",
		});
		setShowModal(true);
	};

	const handleSaveItem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) return;

		const typedCost = formData.unitCostRub.trim();
		const parsedCost = typedCost ? normalizeRubAmountInput(typedCost) : 0;
		if (parsedCost === null) {
			showToast("Цену укажите цифрами, копейки после запятой: 12,50", "error");
			return;
		}
		const unitCost = parsedCost;
		const threshold = Math.max(0, parseInt(formData.threshold, 10) || 0);
		if (isSavingItemRef.current) return;
		isSavingItemRef.current = true;
		setIsSavingItem(true);
		try {
			if (editingItem) {
				const res = await fetch(`/api/inventory/${effectiveOrgId}/${editingItem.id}`, {
					method: "PUT",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						name: formData.name.trim(),
						criticalThreshold: threshold,
						unitCostRub: unitCost,
						sku: formData.sku.trim() || null,
						barcode: formData.barcode.trim() || null,
						lotNumber: formData.lotNumber.trim() || null,
						expirationDate: formData.expirationDate.trim() || null,
					}),
				});
				if (res.ok) {
					showToast("Материал обновлён", "success");
					setShowModal(false);
					fetchItems();
				} else {
					showToast("Ошибка изменения", "error");
				}
			} else {
				const res = await fetch(`/api/inventory/${effectiveOrgId}`, {
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						name: formData.name.trim(),
						criticalThreshold: threshold,
						unitCostRub: unitCost,
						stockQuantity: 0,
						sku: formData.sku.trim() || null,
						barcode: formData.barcode.trim() || null,
						lotNumber: formData.lotNumber.trim() || null,
						expirationDate: formData.expirationDate.trim() || null,
					}),
				});
				if (res.ok) {
					showToast("Материал добавлен", "success");
					setShowModal(false);
					fetchItems();
				} else {
					showToast("Ошибка добавления", "error");
				}
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка", "error");
		} finally {
			isSavingItemRef.current = false;
			setIsSavingItem(false);
		}
	};

	const handleDeleteItem = async (itemId: string, name: string) => {
		setConfirmDialog({
			isOpen: true,
			title: "Удалить материал?",
			message: `Удалить «${name}» со склада? Это действие необратимо.`,
			onConfirm: async () => {
				setConfirmDialog(null);
				try {
					const res = await fetch(`/api/inventory/${effectiveOrgId}/${itemId}`, {
						method: "DELETE",
						headers: getHeaders(),
					});
					if (res.ok) {
						showToast("Материал удалён со склада", "success");
						fetchItems();
					} else {
						showToast("Ошибка удаления", "error");
					}
				} catch (e) {
					logger.error(e);
					showToast("Системная ошибка", "error");
				}
			},
		});
	};

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
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
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
		showModal,
		setShowModal,
		editingItem,
		setEditingItem,
		formData,
		setFormData,
		adjustingItem,
		setAdjustingItem,
		adjustAmount,
		setAdjustAmount,
		adjustType,
		setAdjustType,
		isAdjustingStock,
		isSavingItem,
		openAddModal,
		openEditModal,
		handleSaveItem,
		handleDeleteItem,
		handleAdjustStock,
	};
}
