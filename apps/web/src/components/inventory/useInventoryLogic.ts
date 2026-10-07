import { multiplyKopecks, parseKopecks, sumKopecks } from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext.js";
import { normalizeRubAmountInput } from "../../rubAmountInput.js";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";
import {
	type InventoryItem,
	inventoryItemFromServer,
} from "./inventoryDataMappers.js";
import { useInventoryQuickWriteoff } from "./useInventoryQuickWriteoff.js";
import { useInventoryRules } from "./useInventoryRules.js";

export {
	type InventoryItem,
	inventoryItemFromServer,
};
import { useInventoryStore } from "../../store/inventoryStore.js";

export function useInventoryLogic(organizationId: string) {
	const storeItems = useInventoryStore((s) => s.items);
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard;

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

	const getHeaders = useCallback(
		(extra?: Record<string, string>) => {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders(extra)
					: extra || {};
			return headers;
		},
		[auth],
	);

	// Barcode Scanner State
	const [scannedBarcode, setScannedBarcode] = useState<string>("");
	const [isScannerActive, setIsScannerActive] = useState(false);

	// Confirm Dialog State
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	// Deduction Rules Hook
	const rulesLogic = useInventoryRules({
		organizationId,
		getHeaders,
		setConfirmDialog,
	});

	const [searchQuery, setSearchQuery] = useState("");

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
	const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(
		null,
	);
	const [adjustAmount, setAdjustAmount] = useState("");
	const [adjustType, setAdjustType] = useState<"in" | "out">("in");
	const isAdjustingStockRef = useRef(false);
	const [isAdjustingStock, setIsAdjustingStock] = useState(false);
	const isSavingItemRef = useRef(false);
	const [isSavingItem, setIsSavingItem] = useState(false);

	/*
	 * --- Слушатель сканера штрихкодов (эмуляция «клавиатурного» сканера) ---
	 */
	useEffect(() => {
		let barcodeBuffer = "";
		let lastKeyTime = 0;

		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

			const currentTime = Date.now();
			if (currentTime - lastKeyTime > 100) {
				barcodeBuffer = "";
			}
			lastKeyTime = currentTime;

			if (e.key === "Enter") {
				if (barcodeBuffer.length > 3) {
					setScannedBarcode(barcodeBuffer);
					setIsScannerActive(true);
					showToast(`Отсканирован код: ${barcodeBuffer}`, "success");

					if (showModal) {
						setFormData((prev) => ({ ...prev, barcode: barcodeBuffer }));
						barcodeBuffer = "";
						return;
					}

					if (adjustingItem || confirmDialog?.isOpen) {
						barcodeBuffer = "";
						return;
					}

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
							threshold: "",
							unitCostRub: "",
							sku: "",
							barcode: barcodeBuffer,
							lotNumber: "",
							expirationDate: "",
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
	}, [items, showModal, adjustingItem, confirmDialog]);

	const [loadError, setLoadError] = useState<string | null>(null);

	const fetchItems = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch(`/api/inventory/${organizationId}`, {
				headers: getHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				const parsed = Array.isArray(data) ? data.map(inventoryItemFromServer) : [];
				setItems(parsed);
				useInventoryStore.getState().setItems(
					parsed.map((it) => ({
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
			} else {
				setLoadError(
					res.status === 401 || res.status === 403
						? "Склад не показан: доступ к остаткам не подтверждён. Войдите в кабинет заново."
						: "Склад не отвечает, остатки не загружены. Нажмите «Повторить»; если не поможет — сообщите администратору.",
				);
				showToast("Ошибка загрузки склада", "error");
			}
		} catch (err: unknown) {
			setLoadError(
				err instanceof Error
					? err.message
					: "Не удалось загрузить остатки со склада",
			);
			setItems([]);
			setIsLoading(false);
		} finally {
			setIsLoading(false);
		}
	}, [organizationId, getHeaders]);

	useEffect(() => {
		if (organizationId) {
			fetchItems();
			return;
		}
		setIsLoading(false);
	}, [organizationId, fetchItems]);

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
							lotNumber: formData.lotNumber.trim() || null,
							expirationDate: formData.expirationDate.trim() || null,
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
				`/api/inventory/${organizationId}/${adjustingItem.id}/stock`,
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

	// Quick Writeoff Hook
	const quickWriteoff = useInventoryQuickWriteoff({
		organizationId,
		getHeaders,
		fetchItems,
	});

	const filteredItems = useMemo(() => {
		if (!searchQuery.trim()) return items;
		const q = searchQuery.toLowerCase();
		return items.filter(
			(i) =>
				i.name.toLowerCase().includes(q) ||
				i.sku?.toLowerCase().includes(q) ||
				i.barcode?.toLowerCase().includes(q),
		);
	}, [items, searchQuery]);

	const criticalItemsCount = useMemo(() => {
		return items.filter((i) => i.stockQuantity <= i.criticalThreshold).length;
	}, [items]);

	const totalValue = useMemo(() => {
		const totalKopecks = sumKopecks(
			items.map((item) => {
				const unitCostKopecks = parseKopecks(item.unitCostRub || "0");
				const quantity = Math.max(
					0,
					Math.round(Number(item.stockQuantity) || 0),
				);
				return multiplyKopecks(unitCostKopecks, quantity);
			}),
		);
		return totalKopecks / 100;
	}, [items]);

	return {
		items,
		filteredItems,
		isLoading,
		loadError,
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
		fetchRules: rulesLogic.fetchRules,
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
		isAdjustingStock,
		isSavingItem,
		isSavingRule: rulesLogic.isSavingRule,
		criticalItemsCount,
		lowStockCount: criticalItemsCount,
		totalValue,
		totalItems: items.length,
		confirmDialog,
		setConfirmDialog,
		scannedBarcode,
		isScannerActive,
		setIsScannerActive,
		activeSubTab: rulesLogic.activeSubTab,
		setActiveSubTab: rulesLogic.setActiveSubTab,
		selectedServiceId: rulesLogic.selectedServiceId,
		setSelectedServiceId: rulesLogic.setSelectedServiceId,
		selectService: rulesLogic.selectService,
		rulesList: rulesLogic.rulesList,
		isLoadingRules: rulesLogic.isLoadingRules,
		rulesError: rulesLogic.rulesError,
		selectedInventoryItemId: rulesLogic.selectedInventoryItemId,
		setSelectedInventoryItemId: rulesLogic.setSelectedInventoryItemId,
		quantityToDeduct: rulesLogic.quantityToDeduct,
		setQuantityToDeduct: rulesLogic.setQuantityToDeduct,
		handleAddRule: rulesLogic.handleAddRule,
		handleDeleteRule: rulesLogic.handleDeleteRule,
		handleQuickWriteoffStandardKit: quickWriteoff.handleQuickWriteoffStandardKit,
		isWritingOffStandardKit: quickWriteoff.isWritingOffStandardKit,
		handleQuickWriteoffCarpules: quickWriteoff.handleQuickWriteoffCarpules,
		isWritingOffCarpules: quickWriteoff.isWritingOffCarpules,
		handleQuickWriteoffAnestheticCarpule: quickWriteoff.handleQuickWriteoffAnestheticCarpule,
		handleQuickWriteoffSterilizationKit: quickWriteoff.handleQuickWriteoffSterilizationKit,
		isWritingOffSterilizationKit: quickWriteoff.isWritingOffSterilizationKit,
		handleQuickWriteoffShiftBundle: quickWriteoff.handleQuickWriteoffShiftBundle,
		isWritingOffShiftBundle: quickWriteoff.isWritingOffShiftBundle,
		handleQuickWriteoffVisitBundle: quickWriteoff.handleQuickWriteoffVisitBundle,
		isWritingOffVisitBundle: quickWriteoff.isWritingOffVisitBundle,
		getHeaders,
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		servicesList: (dashboard as any)?.prices || dashboard?.serviceCatalog || [],
	};
}
