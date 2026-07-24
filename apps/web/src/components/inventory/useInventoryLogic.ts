import { useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

export interface InventoryItem {
	id: string;
	name: string;
	stockQuantity: number;
	criticalThreshold: number;
	unitCostRub: string;
	updatedAt: string;
	sku?: string;
	barcode?: string;
	expirationDate?: string;
	lotNumber?: string;
}

export function useInventoryLogic(organizationId: string) {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard;

	const getHeaders = (extra?: Record<string, string>) => {
		if (auth && typeof auth.denteClinicalReadHeaders === "function") {
			return auth.denteClinicalReadHeaders(extra);
		}
		return { "x-organization-id": organizationId || "00000000-0000-0000-0000-000000000001", ...(extra || {}) };
	};

	// Barcode Scanner State
	const [scannedBarcode, setScannedBarcode] = useState<string>("");
	const [isScannerActive, setIsScannerActive] = useState(false);

	const [activeSubTab, setActiveSubTab] = useState<"inventory" | "rules">(
		"inventory",
	);
	const [selectedServiceId, setSelectedServiceId] = useState<string>("");
	const [rulesList, setRulesList] = useState<any[]>([]);
	const [isLoadingRules, setIsLoadingRules] = useState(false);
	const [selectedInventoryItemId, setSelectedInventoryItemId] =
		useState<string>("");
	const [quantityToDeduct, setQuantityToDeduct] = useState<string>("1");

	const fetchRules = async (serviceId: string) => {
		if (!serviceId) {
			setRulesList([]);
			return;
		}
		try {
			setIsLoadingRules(true);
			const res = await fetch(
				`/api/inventory/${organizationId}/rules/${serviceId}`,
				{
					headers: getHeaders(),
				},
			);
			if (res.ok) {
				const data = await res.json();
				setRulesList(Array.isArray(data) ? data : []);
			} else {
				showToast("Ошибка загрузки правил", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Ошибка загрузки правил", "error");
		} finally {
			setIsLoadingRules(false);
		}
	};

	useEffect(() => {
		if (activeSubTab === "rules" && selectedServiceId) {
			fetchRules(selectedServiceId);
		}
	}, [activeSubTab, selectedServiceId]);

	// --- Global Barcode Scanner Listener (Hardware Emulation) ---
	useEffect(() => {
		let barcodeBuffer = "";
		let lastKeyTime = 0;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if user is typing in an input or textarea
			const target = e.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

			const currentTime = Date.now();
			// Barcode scanners type very fast (usually < 30ms per character).
			// If more than 100ms passed since last key, reset the buffer.
			if (currentTime - lastKeyTime > 100) {
				barcodeBuffer = "";
			}
			lastKeyTime = currentTime;

			if (e.key === "Enter") {
				if (barcodeBuffer.length > 3) {
					// Likely a barcode scan
					setScannedBarcode(barcodeBuffer);
					setIsScannerActive(true);
					showToast(`Отсканирован код: ${barcodeBuffer}`, "success");

					// Optional: Auto-filter the list or open the "Add" modal for this item
					const found = items.find(
						(i) => i.barcode === barcodeBuffer || i.sku === barcodeBuffer,
					);
					if (found) {
						showToast(`Найден товар: ${found.name}`, "info");
						setSearchQuery(barcodeBuffer);
					} else {
						showToast("Неизвестный товар. Добавьте его в базу.", "warning");
						setFormData({
							name: "",
							threshold: "5",
							unitCostRub: "0",
							sku: "",
							barcode: barcodeBuffer,
						});
						setEditingItem(null);
						setShowModal(true);
					}
				}
				barcodeBuffer = "";
			} else if (e.key.length === 1) {
				barcodeBuffer += e.key;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [items]);

	const handleAddRule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedServiceId || !selectedInventoryItemId || !quantityToDeduct)
			return;

		const qty = parseInt(quantityToDeduct);
		if (isNaN(qty) || qty <= 0) {
			showToast("Введите корректное количество", "error");
			return;
		}

		try {
			const res = await fetch(`/api/inventory/${organizationId}/rules`, {
				method: "POST",
				headers: getHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					serviceId: selectedServiceId,
					inventoryItemId: selectedInventoryItemId,
					quantityToDeduct: qty,
				}),
			});

			if (res.ok) {
				showToast("Правило списания сохранено", "success");
				setSelectedInventoryItemId("");
				setQuantityToDeduct("1");
				fetchRules(selectedServiceId);
			} else {
				showToast("Ошибка сохранения правила", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Системная ошибка", "error");
		}
	};

	const handleDeleteRule = async (ruleId: string) => {
		setConfirmDialog({
			isOpen: true,
			title: "Удалить правило?",
			message: "Удалить это правило списания? Это действие необратимо.",
			onConfirm: async () => {
				setConfirmDialog(null);
				try {
					const res = await fetch(
						`/api/inventory/${organizationId}/rules/${ruleId}`,
						{
							method: "DELETE",
							headers: getHeaders(),
						},
					);

					if (res.ok) {
						showToast("Правило списания удалено", "success");
						fetchRules(selectedServiceId);
					} else {
						showToast("Ошибка удаления правила", "error");
					}
				} catch (e) {
					console.error(e);
					showToast("Системная ошибка", "error");
				}
			},
		});
	};

	const [searchQuery, setSearchQuery] = useState("");

	// Add/Edit Modal
	const [showModal, setShowModal] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		threshold: "5",
		unitCostRub: "0",
		sku: "",
		barcode: "",
	});

	// Confirm Dialog State
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	// Adjust Modal
	const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(
		null,
	);
	const [adjustAmount, setAdjustAmount] = useState("");
	const [adjustType, setAdjustType] = useState<"in" | "out">("in");

	const fetchItems = async () => {
		try {
			setIsLoading(true);
			const res = await fetch(`/api/inventory/${organizationId}`, {
				headers: getHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setItems(Array.isArray(data) ? data : []);
			} else {
				showToast("Ошибка загрузки склада", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Ошибка загрузки склада", "error");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (organizationId) {
			fetchItems();
		}
	}, [organizationId]);

	const openAddModal = () => {
		setEditingItem(null);
		setFormData({
			name: "",
			threshold: "5",
			unitCostRub: "0",
			sku: "",
			barcode: "",
		});
		setShowModal(true);
	};

	const openEditModal = (item: InventoryItem) => {
		setEditingItem(item);
		setFormData({
			name: item.name,
			threshold: String(item.criticalThreshold),
			unitCostRub: item.unitCostRub || "0",
			sku: item.sku || "",
			barcode: item.barcode || "",
		});
		setShowModal(true);
	};

	const handleSaveItem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) return;
		const unitCost = Math.max(0, parseFloat(formData.unitCostRub) || 0);
		const threshold = Math.max(0, parseInt(formData.threshold) || 5);
		try {
			if (editingItem) {
				const res = await fetch(
					`/api/inventory/${organizationId}/${editingItem.id}`,
					{
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
						}),
					},
				);
				if (res.ok) {
					showToast("Материал обновлён", "success");
					setShowModal(false);
					fetchItems();
				} else {
					showToast("Ошибка изменения", "error");
				}
			} else {
				const res = await fetch(`/api/inventory/${organizationId}`, {
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
			console.error(e);
			showToast("Системная ошибка", "error");
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
					const res = await fetch(
						`/api/inventory/${organizationId}/${itemId}`,
						{
							method: "DELETE",
							headers: getHeaders(),
						},
					);
					if (res.ok) {
						showToast("Материал удалён со склада", "success");
						fetchItems();
					} else {
						showToast("Ошибка удаления", "error");
					}
				} catch (e) {
					console.error(e);
					showToast("Системная ошибка", "error");
				}
			},
		});
	};

	const handleAdjustStock = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!adjustingItem || !adjustAmount) return;

		const amount = parseInt(adjustAmount);
		if (isNaN(amount) || amount <= 0) return;

		const adjustment = adjustType === "in" ? amount : -amount;

		try {
			const res = await fetch(
				`/api/inventory/${organizationId}/${adjustingItem.id}/stock`,
				{
					method: "PATCH",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ adjustment }),
				},
			);
			if (res.ok) {
				setAdjustingItem(null);
				setAdjustAmount("");
				showToast("Остаток изменён", "success");
				fetchItems();
			} else {
				showToast("Ошибка изменения остатка", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Системная ошибка", "error");
		}
	};

	const filteredItems = useMemo(() => {
		if (!searchQuery.trim()) return items;
		const q = searchQuery.toLowerCase();
		return items.filter(
			(i) =>
				i.name.toLowerCase().includes(q) ||
				(i.sku && i.sku.toLowerCase().includes(q)) ||
				(i.barcode && i.barcode.toLowerCase().includes(q)),
		);
	}, [items, searchQuery]);

	const criticalItemsCount = useMemo(() => {
		return items.filter((i) => i.stockQuantity <= i.criticalThreshold).length;
	}, [items]);

	const totalValue = useMemo(() => {
		return items.reduce((acc, item) => {
			const cost = parseFloat(item.unitCostRub || "0") || 0;
			return acc + item.stockQuantity * cost;
		}, 0);
	}, [items]);

	return {
		items,
		filteredItems,
		isLoading,
		auth,
		dashboard,
		searchQuery,
		setSearchQuery,
		showModal,
		setShowModal,
		editingItem,
		setEditingItem,
		formData,
		setFormData,
		fetchItems,
		fetchRules,
		openAddModal,
		openEditModal,
		handleSaveItem,
		handleDeleteItem,
		adjustingItem,
		setAdjustingItem,
		adjustAmount,
		setAdjustAmount,
		adjustType,
		setAdjustType,
		handleAdjustStock,
		criticalItemsCount,
		lowStockCount: criticalItemsCount,
		totalValue,
		totalItems: items.length,
		confirmDialog,
		setConfirmDialog,
		scannedBarcode,
		isScannerActive,
		setIsScannerActive,
		activeSubTab,
		setActiveSubTab,
		selectedServiceId,
		setSelectedServiceId,
		rulesList,
		isLoadingRules,
		selectedInventoryItemId,
		setSelectedInventoryItemId,
		quantityToDeduct,
		setQuantityToDeduct,
		handleAddRule,
		handleDeleteRule,
		servicesList: dashboard?.prices || [],
	};
}
