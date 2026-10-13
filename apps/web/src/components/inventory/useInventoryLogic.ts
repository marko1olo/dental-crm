import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext.js";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import { useInventoryStore } from "../../store/inventoryStore.js";
import { isDemoShowcaseMode } from "../../utils/demoModeEngine.js";
import { buildCanonicalFallbackWarehouseItems } from "./bomModules/materialBomTypes.js";
import {
	type InventoryItem,
	inventoryItemFromServer,
} from "./inventoryDataMappers.js";
import { useInventoryFiltering } from "./useInventoryFiltering.js";
import { useInventoryOperations } from "./useInventoryOperations.js";
import { useInventoryQuickWriteoff } from "./useInventoryQuickWriteoff.js";
import { useInventoryRules } from "./useInventoryRules.js";

export {
	type InventoryItem,
	inventoryItemFromServer,
};

export function useInventoryLogic(organizationId: string) {
	const storeItems = useInventoryStore((s) => s.items);
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard;
	const effectiveOrgId =
		organizationId ||
		dashboard?.clinicSettings?.profile?.organizationId ||
		"01a00000-0000-0000-0000-000000000000";

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

	const getHeaders = useCallback(
		(extra?: Record<string, string>) => {
			const base =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders(extra)
					: extra || {};
			return getDenteAuthHeaders(base);
		},
		[auth],
	);

	// Confirmation Dialog State
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	// Inventory Item Mutations and Modal State Sub-hook
	const operations = useInventoryOperations({
		effectiveOrgId,
		getHeaders,
		fetchItems: async () => {
			await fetchItems();
		},
		setConfirmDialog,
	});

	// Inventory Search, Barcode Scanner and Metrics Sub-hook
	const filtering = useInventoryFiltering({
		items,
		showModal: operations.showModal,
		adjustingItem: operations.adjustingItem,
		confirmDialogOpen: Boolean(confirmDialog?.isOpen),
		setFormData: operations.setFormData,
		setEditingItem: operations.setEditingItem,
		setShowModal: operations.setShowModal,
	});

	// Deduction Rules Sub-hook
	const rulesLogic = useInventoryRules({
		organizationId: effectiveOrgId,
		getHeaders,
		setConfirmDialog,
	});

	// Fast Consumable Writeoffs Sub-hook
	const quickWriteoff = useInventoryQuickWriteoff({
		organizationId: effectiveOrgId,
		getHeaders,
		fetchItems: async () => {
			await fetchItems();
		},
	});

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

	return {
		items,
		filteredItems: filtering.filteredItems,
		isLoading,
		loadError,
		auth,
		dashboard,
		searchQuery: filtering.searchQuery,
		setSearchQuery: filtering.setSearchQuery,
		showModal: operations.showModal,
		setShowModal: operations.setShowModal,
		editingItem: operations.editingItem,
		setEditingItem: operations.setEditingItem,
		formData: operations.formData,
		setFormData: operations.setFormData,
		fetchItems,
		fetchRules: rulesLogic.fetchRules,
		openAddModal: operations.openAddModal,
		openEditModal: operations.openEditModal,
		handleSaveItem: operations.handleSaveItem,
		handleDeleteItem: operations.handleDeleteItem,
		adjustingItem: operations.adjustingItem,
		setAdjustingItem: operations.setAdjustingItem,
		adjustAmount: operations.adjustAmount,
		setAdjustAmount: operations.setAdjustAmount,
		adjustType: operations.adjustType,
		setAdjustType: operations.setAdjustType,
		handleAdjustStock: operations.handleAdjustStock,
		isAdjustingStock: operations.isAdjustingStock,
		isSavingItem: operations.isSavingItem,
		isSavingRule: rulesLogic.isSavingRule,
		criticalItemsCount: filtering.criticalItemsCount,
		lowStockCount: filtering.lowStockCount,
		totalValue: filtering.totalValue,
		totalItems: filtering.totalItems,
		confirmDialog,
		setConfirmDialog,
		scannedBarcode: filtering.scannedBarcode,
		isScannerActive: filtering.isScannerActive,
		setIsScannerActive: filtering.setIsScannerActive,
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
