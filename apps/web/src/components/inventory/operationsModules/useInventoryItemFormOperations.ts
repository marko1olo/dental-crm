import React, { useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import {
	deleteInventoryItemApi,
	saveInventoryItemApi,
} from "./inventoryItemApiMutations.js";

export interface UseInventoryItemFormOperationsParams {
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

const INITIAL_FORM_DATA = {
	name: "",
	threshold: "",
	unitCostRub: "",
	sku: "",
	barcode: "",
	lotNumber: "",
	expirationDate: "",
};

export function useInventoryItemFormOperations({
	effectiveOrgId,
	getHeaders,
	fetchItems,
	setConfirmDialog,
}: UseInventoryItemFormOperationsParams) {
	const [showModal, setShowModal] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [formData, setFormData] = useState(INITIAL_FORM_DATA);
	const isSavingItemRef = useRef(false);
	const [isSavingItem, setIsSavingItem] = useState(false);

	const openAddModal = () => {
		setEditingItem(null);
		setFormData(INITIAL_FORM_DATA);
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
		if (!formData.name.trim() || isSavingItemRef.current) return;
		isSavingItemRef.current = true;
		setIsSavingItem(true);
		try {
			const res = await saveInventoryItemApi({
				effectiveOrgId, getHeaders, formData, editingItem,
			});
			if (res.error) showToast(res.error, "error");
			else if (res.success) {
				showToast(editingItem ? "Материал обновлён" : "Материал добавлен", "success");
				setShowModal(false);
				fetchItems();
			} else {
				showToast(editingItem ? "Ошибка изменения" : "Ошибка добавления", "error");
			}
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
				const ok = await deleteInventoryItemApi(effectiveOrgId, itemId, getHeaders);
				if (ok) {
					showToast("Материал удалён со склада", "success");
					fetchItems();
				} else {
					showToast("Ошибка удаления", "error");
				}
			},
		});
	};

	return {
		showModal, setShowModal,
		editingItem, setEditingItem,
		formData, setFormData,
		isSavingItem,
		openAddModal, openEditModal,
		handleSaveItem, handleDeleteItem,
	};
}
