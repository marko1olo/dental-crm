import { useCallback, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import {
	type InventoryItem,
	inventoryItemFromServer,
} from "./inventoryDataMappers.js";
import { useInventoryFiltering } from "./useInventoryFiltering.js";
import { useInventoryOperations } from "./useInventoryOperations.js";
import { useInventoryQuickWriteoff } from "./useInventoryQuickWriteoff.js";
import { useInventoryRules } from "./useInventoryRules.js";
import { useInventoryStockFetcher } from "./useInventoryStockFetcher.js";

export {
	type InventoryItem,
	inventoryItemFromServer,
};

export function useInventoryLogic(organizationId: string) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard;
	const effectiveOrgId =
		organizationId ||
		dashboard?.clinicSettings?.profile?.organizationId ||
		dashboard?.activeVisit?.organizationId ||
		(() => {
			try {
				if (typeof window !== "undefined") {
					const cached = localStorage.getItem("dente_cached_active_staff_user") || localStorage.getItem("dental-crm:active-user:v1");
					if (cached) {
						const u = JSON.parse(cached);
						if (u?.organizationId) return String(u.organizationId);
					}
				}
			} catch (_) {}
			return "";
		})() ||
		"current";

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

	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	const { items, isLoading, loadError, fetchItems } = useInventoryStockFetcher(
		effectiveOrgId,
		getHeaders,
	);

	const operations = useInventoryOperations({
		effectiveOrgId, getHeaders,
		fetchItems: async () => { await fetchItems(); },
		setConfirmDialog,
	});

	const filtering = useInventoryFiltering({
		items, showModal: operations.showModal, adjustingItem: operations.adjustingItem,
		confirmDialogOpen: Boolean(confirmDialog?.isOpen),
		setFormData: operations.setFormData, setEditingItem: operations.setEditingItem,
		setShowModal: operations.setShowModal,
	});

	const rulesLogic = useInventoryRules({
		organizationId: effectiveOrgId, getHeaders, setConfirmDialog,
	});

	const quickWriteoff = useInventoryQuickWriteoff({
		organizationId: effectiveOrgId, getHeaders,
		fetchItems: async () => { await fetchItems(); },
	});

	return {
		items, filteredItems: filtering.filteredItems, isLoading, loadError, auth, dashboard,
		searchQuery: filtering.searchQuery, setSearchQuery: filtering.setSearchQuery,
		showModal: operations.showModal, setShowModal: operations.setShowModal,
		editingItem: operations.editingItem, setEditingItem: operations.setEditingItem,
		formData: operations.formData, setFormData: operations.setFormData,
		fetchItems, fetchRules: rulesLogic.fetchRules,
		openAddModal: operations.openAddModal, openEditModal: operations.openEditModal,
		handleSaveItem: operations.handleSaveItem, handleDeleteItem: operations.handleDeleteItem,
		adjustingItem: operations.adjustingItem, setAdjustingItem: operations.setAdjustingItem,
		adjustAmount: operations.adjustAmount, setAdjustAmount: operations.setAdjustAmount,
		adjustType: operations.adjustType, setAdjustType: operations.setAdjustType,
		handleAdjustStock: operations.handleAdjustStock, isAdjustingStock: operations.isAdjustingStock,
		isSavingItem: operations.isSavingItem, isSavingRule: rulesLogic.isSavingRule,
		criticalItemsCount: filtering.criticalItemsCount, lowStockCount: filtering.lowStockCount,
		totalValue: filtering.totalValue, totalItems: filtering.totalItems,
		confirmDialog, setConfirmDialog,
		scannedBarcode: filtering.scannedBarcode, isScannerActive: filtering.isScannerActive,
		setIsScannerActive: filtering.setIsScannerActive,
		activeSubTab: rulesLogic.activeSubTab, setActiveSubTab: rulesLogic.setActiveSubTab,
		selectedServiceId: rulesLogic.selectedServiceId, setSelectedServiceId: rulesLogic.setSelectedServiceId,
		selectService: rulesLogic.selectService, rulesList: rulesLogic.rulesList,
		isLoadingRules: rulesLogic.isLoadingRules, rulesError: rulesLogic.rulesError,
		selectedInventoryItemId: rulesLogic.selectedInventoryItemId, setSelectedInventoryItemId: rulesLogic.setSelectedInventoryItemId,
		quantityToDeduct: rulesLogic.quantityToDeduct, setQuantityToDeduct: rulesLogic.setQuantityToDeduct,
		handleAddRule: rulesLogic.handleAddRule, handleDeleteRule: rulesLogic.handleDeleteRule,
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
		servicesList: (dashboard as Record<string, unknown> | undefined)?.prices ?? dashboard?.serviceCatalog ?? [],
	};
}
