import { Package } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useInventoryLogic } from "./inventory/useInventoryLogic.js";
import { InventoryTopToolbar } from "./inventory/InventoryTopToolbar.js";
import { WarehousePackageWriteOffBar } from "./inventory/WarehousePackageWriteOffBar.js";
import {
	useInventoryViewCategories, INVENTORY_CATEGORIES, type InventoryCategoryFilter,
} from "./inventory/viewModules/useInventoryViewCategories.js";
import { useInventoryViewAudit } from "./inventory/viewModules/useInventoryViewAudit.js";
import { InventoryViewMobileLayout } from "./inventory/viewModules/InventoryViewMobileLayout.js";
import { InventoryViewContentRouter } from "./inventory/viewModules/InventoryViewContentRouter.js";
import { InventoryViewModalsContainer } from "./inventory/viewModules/InventoryViewModalsContainer.js";
import { SterilizationBatchCycleModal } from "./inventory/sterilizationCycle/SterilizationBatchCycleModal.js";

export { INVENTORY_CATEGORIES, type InventoryCategoryFilter };
export * from "./InventoryStockTable.js";
export * from "./InventoryBatchFefoPanel.js";
export * from "./InventoryInboundInvoiceModal.js";
export * from "./InventoryServiceUsagePanel.js";
export * from "./inventory/InventoryOperationsMenu.js";
export * from "./inventory/InventoryItemFormModal.js";
export * from "./inventory/InventoryStockAdjustModal.js";
export * from "./inventory/InventoryExternalModals.js";
export * from "./inventory/ShiftBatchDeductionModal.js";
export * from "./inventory/MobileInventoryGroupedList.js";
export * from "./inventory/InventoryTopToolbar.js";
export * from "./inventory/WarehouseWaybillsTab.js";
export * from "./inventory/WarehouseInventoryTab.js";

const InventoryViewInner: React.FC<{ organizationId: string }> = ({ organizationId }) => {
	const inv = useInventoryLogic(organizationId);
	const { items, isLoading, loadError, activeSubTab, setActiveSubTab, rulesList, searchQuery, setSearchQuery,
		showModal, setShowModal, editingItem, formData, setFormData, confirmDialog, setConfirmDialog,
		adjustingItem, setAdjustingItem, adjustAmount, setAdjustAmount, adjustType, setAdjustType,
		isAdjustingStock, isSavingItem, fetchItems, handleQuickWriteoffStandardKit, handleQuickWriteoffCarpules,
		isWritingOffCarpules, handleQuickWriteoffAnestheticCarpule, handleQuickWriteoffSterilizationKit,
		handleQuickWriteoffShiftBundle, handleQuickWriteoffVisitBundle, openAddModal, openEditModal,
		handleSaveItem, handleDeleteItem, handleAdjustStock, filteredItems, totalValue, lowStockCount,
		totalItems, getHeaders } = inv;

	const [isClinicalWriteoffOpen, setIsClinicalWriteoffOpen] = useState(false), [isProcedureDeductionOpen, setIsProcedureDeductionOpen] = useState(false);
	const [isDeductingMaterials, setIsDeductingMaterials] = useState(false), [isWarehouseTransferOpen, setIsWarehouseTransferOpen] = useState(false);
	const [isInventoryAuditOpen, setIsInventoryAuditOpen] = useState(false), [isMdlpDisposalOpen, setIsMdlpDisposalOpen] = useState(false);
	const [isWarehouseManagerOpen, setIsWarehouseManagerOpen] = useState(false), [isMdlpScanningOpen, setIsMdlpScanningOpen] = useState(false);
	const [isNurseCarpuleModalOpen, setIsNurseCarpuleModalOpen] = useState(false), [isAcceptanceWaybillsOpen, setIsAcceptanceWaybillsOpen] = useState(false);
	const [isInboundInvoiceModalOpen, setIsInboundInvoiceModalOpen] = useState(false), [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
	const [isQuickPackagesOpen, setIsQuickPackagesOpen] = useState(false), [isShiftDeductionOpen, setIsShiftDeductionOpen] = useState(false);
	const [isConsumablesDeductionOpen, setIsConsumablesDeductionOpen] = useState(false), [isSterilizationCycleOpen, setIsSterilizationCycleOpen] = useState(false), [stockViewMode, setStockViewMode] = useState<"standard" | "fefo">("standard");
	const { auditInitialDoc, handleApplyInventoryAudit } = useInventoryViewAudit(organizationId, items, getHeaders, fetchItems);
	const { selectedCategory, setSelectedCategory, setDisplayLimit, inventorySlice } = useInventoryViewCategories(filteredItems, searchQuery, activeSubTab);
	const isMobile = useIsMobile(768);

	const stockMap = useMemo(() => {
		const map: Record<string, number> = {};
		for (const it of items) map[it.id] = Number(it.stockQuantity) || 0;
		return map;
	}, [items]);

	const extModalProps = {
		isClinicalWriteoffOpen, onCloseClinicalWriteoff: () => setIsClinicalWriteoffOpen(false),
		isProcedureDeductionOpen, onCloseProcedureDeduction: () => setIsProcedureDeductionOpen(false),
		isWarehouseTransferOpen, onCloseWarehouseTransfer: () => setIsWarehouseTransferOpen(false),
		isInventoryAuditOpen, onCloseInventoryAudit: () => setIsInventoryAuditOpen(false), onOpenInventoryAudit: () => setIsInventoryAuditOpen(true),
		isMdlpDisposalOpen, onCloseMdlpDisposal: () => setIsMdlpDisposalOpen(false),
		isWarehouseManagerOpen, onCloseWarehouseManager: () => setIsWarehouseManagerOpen(false),
		isMdlpScanningOpen, onCloseMdlpScanning: () => setIsMdlpScanningOpen(false),
		isNurseCarpuleModalOpen, onCloseNurseCarpuleModal: () => setIsNurseCarpuleModalOpen(false),
		isAcceptanceWaybillsOpen, onCloseAcceptanceWaybills: () => setIsAcceptanceWaybillsOpen(false),
		isInboundInvoiceModalOpen, onCloseInboundInvoiceModal: () => setIsInboundInvoiceModalOpen(false),
		isDeductingMaterials, setIsDeductingMaterials,
	};

	if (isLoading && items.length === 0) {
		return <div className="flex items-center justify-center h-full text-[var(--muted)] gap-3"><Package size={20} /><span>Загрузка склада...</span></div>;
	}
	if (isMobile) {
		return <InventoryViewMobileLayout items={items} organizationId={organizationId} searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} openEditModal={openEditModal} openAddModal={openAddModal} setIsInboundInvoiceModalOpen={setIsInboundInvoiceModalOpen} setIsAcceptanceWaybillsOpen={setIsAcceptanceWaybillsOpen} handleQuickWriteoffCarpules={handleQuickWriteoffCarpules} isWritingOffCarpules={isWritingOffCarpules} fetchItems={fetchItems} getHeaders={getHeaders} showModal={showModal} setShowModal={setShowModal} editingItem={editingItem} formData={formData} setFormData={setFormData} handleSaveItem={handleSaveItem} isSavingItem={isSavingItem} confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog} externalModalsProps={extModalProps} auditInitialDoc={auditInitialDoc} isShiftDeductionOpen={isShiftDeductionOpen} setIsShiftDeductionOpen={setIsShiftDeductionOpen} onOpenShiftDeduction={() => setIsShiftDeductionOpen(true)} />;
	}

	return (
		<div className="w-full h-full flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			<InventoryTopToolbar activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} stockViewMode={stockViewMode} setStockViewMode={setStockViewMode} itemsCount={items.length} rulesCount={rulesList.length} totalItems={totalItems} lowStockCount={lowStockCount} totalValue={totalValue} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isQuickPackagesOpen={isQuickPackagesOpen} setIsQuickPackagesOpen={setIsQuickPackagesOpen} isWritingOffCarpules={isWritingOffCarpules} handleQuickWriteoffCarpules={handleQuickWriteoffCarpules} isOpsMenuOpen={isOpsMenuOpen} setIsOpsMenuOpen={setIsOpsMenuOpen} setIsAcceptanceWaybillsOpen={setIsAcceptanceWaybillsOpen} setIsWarehouseManagerOpen={setIsWarehouseManagerOpen} setIsMdlpScanningOpen={setIsMdlpScanningOpen} setIsClinicalWriteoffOpen={setIsClinicalWriteoffOpen} setIsProcedureDeductionOpen={setIsProcedureDeductionOpen} setIsWarehouseTransferOpen={setIsWarehouseTransferOpen} setIsInventoryAuditOpen={setIsInventoryAuditOpen} setIsMdlpDisposalOpen={setIsMdlpDisposalOpen} setIsNurseCarpuleModalOpen={setIsNurseCarpuleModalOpen} onOpenShiftDeductionModal={() => setIsShiftDeductionOpen(true)} onOpenSterilizationCycleModal={() => setIsSterilizationCycleOpen(true)} onOpenProtocolDeduction={() => setIsConsumablesDeductionOpen(true)} handleQuickWriteoffStandardKit={handleQuickWriteoffStandardKit} handleQuickWriteoffAnestheticCarpule={handleQuickWriteoffAnestheticCarpule} handleQuickWriteoffSterilizationKit={handleQuickWriteoffSterilizationKit} handleQuickWriteoffVisitBundle={handleQuickWriteoffVisitBundle} handleQuickWriteoffShiftBundle={handleQuickWriteoffShiftBundle} setIsInboundInvoiceModalOpen={setIsInboundInvoiceModalOpen} openAddModal={openAddModal} />

			{activeSubTab === "inventory" && (
				<div className="dente-filter-chips min-h-[36px] sm:h-9 px-3 py-1 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap shrink-0" role="toolbar" aria-label="Фильтр по категориям материалов" data-testid="inventory-category-filters-row">
					<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mr-1 shrink-0">Категории:</span>
					{INVENTORY_CATEGORIES.map((cat) => {
						const Icon = cat.icon;
						const isActive = selectedCategory === cat.id;
						return (
							<button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)} className={`dente-filter-chip secondary-button ${isActive ? "active" : ""}`} aria-pressed={isActive} data-testid={`inventory-category-chip-${cat.id}`}>
								<Icon size={13} className="shrink-0" /><span>{cat.label}</span>
							</button>
						);
					})}
				</div>
			)}

			{activeSubTab === "inventory" && isQuickPackagesOpen && (
				<div className="p-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<WarehousePackageWriteOffBar warehouseItems={items} organizationId={organizationId} allowSoftOverdraft={true} onWriteOffComplete={() => fetchItems()} />
				</div>
			)}

			<div className="p-2 flex-1 flex flex-col min-h-0 overflow-hidden w-full">
				<InventoryViewContentRouter activeSubTab={activeSubTab} stockViewMode={stockViewMode} organizationId={organizationId} items={items} rulesList={rulesList} isLoading={isLoading} loadError={loadError} searchQuery={searchQuery} inventorySlice={inventorySlice} setDisplayLimit={setDisplayLimit} fetchItems={fetchItems} getHeaders={getHeaders} handleApplyInventoryAudit={handleApplyInventoryAudit} openEditModal={openEditModal} openAddModal={openAddModal} setAdjustingItem={setAdjustingItem} setAdjustType={setAdjustType} setAdjustAmount={setAdjustAmount} handleDeleteItem={handleDeleteItem} setIsAcceptanceWaybillsOpen={setIsAcceptanceWaybillsOpen} setIsWarehouseManagerOpen={setIsWarehouseManagerOpen} setIsInventoryAuditOpen={setIsInventoryAuditOpen} setIsClinicalWriteoffOpen={setIsClinicalWriteoffOpen} handleQuickWriteoffCarpules={handleQuickWriteoffCarpules} />
			</div>

			<InventoryViewModalsContainer organizationId={organizationId} items={items} showModal={showModal} setShowModal={setShowModal} editingItem={editingItem} formData={formData} setFormData={setFormData} handleSaveItem={handleSaveItem} isSavingItem={isSavingItem} adjustingItem={adjustingItem} setAdjustingItem={setAdjustingItem} adjustType={adjustType} setAdjustType={setAdjustType} adjustAmount={adjustAmount} setAdjustAmount={setAdjustAmount} handleAdjustStock={handleAdjustStock} isAdjustingStock={isAdjustingStock} confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog} auditInitialDoc={auditInitialDoc} externalModalsProps={extModalProps} isShiftDeductionOpen={isShiftDeductionOpen} setIsShiftDeductionOpen={setIsShiftDeductionOpen} isConsumablesDeductionOpen={isConsumablesDeductionOpen} setIsConsumablesDeductionOpen={setIsConsumablesDeductionOpen} stockMap={stockMap} fetchItems={fetchItems} getHeaders={getHeaders} handleQuickWriteoffCarpules={handleQuickWriteoffCarpules} />
			<SterilizationBatchCycleModal isOpen={isSterilizationCycleOpen} onClose={() => setIsSterilizationCycleOpen(false)} organizationId={organizationId} onCycleCompleted={() => fetchItems()} />
		</div>
	);
};

export const InventoryView = React.memo(InventoryViewInner);
export default InventoryView;
