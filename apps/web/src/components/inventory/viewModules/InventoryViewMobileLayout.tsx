import React, { useState, lazy, Suspense } from "react";
import { money } from "../../../AppHelpers.js";
import { MobileInventoryGroupedList, type MobileInventoryCategoryType } from "../MobileInventoryGroupedList.js";
import { InventoryItemFormModal } from "../InventoryItemFormModal.js";
import { InventoryConfirmDialog } from "../InventoryConfirmDialog.js";
import { InboundWaybillModal } from "../InboundWaybillModal.js";
import { WarehouseBatchWriteoffModal } from "../WarehouseBatchWriteoffModal.js";
import { WarehouseInventoryAuditModal } from "../WarehouseInventoryAuditModal.js";

const MdlpScanningModal = lazy(() => import("../../mdlp/MdlpScanningModal.js").then((m) => ({ default: m.MdlpScanningModal })));
import {
	type InventoryViewMobileLayoutProps,
	mobileQuickDeduct,
	mobileReceiveItem,
} from "./inventoryMobileTypes.js";

export type { InventoryViewMobileLayoutProps };

export const InventoryViewMobileLayout: React.FC<InventoryViewMobileLayoutProps> = (props) => {
	const {
		items, organizationId, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
		openEditModal, openAddModal, setIsInboundInvoiceModalOpen, setIsAcceptanceWaybillsOpen,
		handleQuickWriteoffCarpules, isWritingOffCarpules, fetchItems, getHeaders,
		showModal, setShowModal, editingItem, formData, setFormData, handleSaveItem, isSavingItem,
		confirmDialog, setConfirmDialog, externalModalsProps, auditInitialDoc,
		isShiftDeductionOpen, setIsShiftDeductionOpen, onOpenShiftDeduction,
	} = props;

	const [isMobileWaybillOpen, setIsMobileWaybillOpen] = useState(false);
	const [isMobileBatchOpen, setIsMobileBatchOpen] = useState(false);

	const isWaybillActive = Boolean(
		isMobileWaybillOpen || externalModalsProps?.isInboundWaybillOpen ||
		externalModalsProps?.isAcceptanceWaybillsOpen || externalModalsProps?.isInboundInvoiceModalOpen,
	);
	const isBatchActive = Boolean(
		isMobileBatchOpen || isShiftDeductionOpen ||
		externalModalsProps?.isBatchWriteoffOpen || externalModalsProps?.isClinicalWriteoffOpen,
	);

	const handleCloseWaybill = () => {
		setIsMobileWaybillOpen(false);
		setIsInboundInvoiceModalOpen(false);
		setIsAcceptanceWaybillsOpen(false);
	};
	const handleCloseBatch = () => {
		setIsMobileBatchOpen(false);
		if (setIsShiftDeductionOpen) setIsShiftDeductionOpen(false);
	};

	return (
		<div className="w-full h-full flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			<MobileInventoryGroupedList
				items={items} organizationId={organizationId} searchQuery={searchQuery}
				onSearchChange={setSearchQuery} onClearSearch={() => setSearchQuery("")}
				selectedCategory={
					selectedCategory === "therapy" || selectedCategory === "composite" ? "filling" : (selectedCategory as MobileInventoryCategoryType)
				}
				onSelectCategory={(cat) => setSelectedCategory(cat === "filling" ? "composite" : cat)}
				onQuickDeduct={(item, qty) => mobileQuickDeduct(organizationId, item.id, qty, getHeaders, fetchItems)}
				onReceiveItem={(item, qty, lotNumber, expDate) => mobileReceiveItem(organizationId, item.id, qty, lotNumber, expDate, getHeaders, fetchItems)}
				onSelectItem={(item) => openEditModal(item)} onEditItem={(item) => openEditModal(item)}
				onOpenAddModal={openAddModal} onOpenInboundInvoice={() => setIsMobileWaybillOpen(true)}
				onOpenWaybills={() => setIsMobileWaybillOpen(true)}
				onOpenShiftDeduction={onOpenShiftDeduction || (() => setIsMobileBatchOpen(true))}
				onOpenMdlpScanning={externalModalsProps?.onOpenMdlpScanning}
				onQuickWriteoffCarpules={handleQuickWriteoffCarpules} isWritingOffCarpules={isWritingOffCarpules}
				onRefresh={() => fetchItems()} money={money}
			/>

			<InventoryItemFormModal
				isOpen={showModal} onClose={() => setShowModal(false)}
				editingItem={editingItem} formData={formData} setFormData={setFormData}
				onSubmit={handleSaveItem} isSaving={isSavingItem}
			/>

			{confirmDialog?.isOpen && (
				<InventoryConfirmDialog
					title={confirmDialog.title} message={confirmDialog.message}
					onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)}
				/>
			)}

			{isWaybillActive && (
				<InboundWaybillModal
					isOpen={isWaybillActive} onClose={handleCloseWaybill}
					organizationId={organizationId} inventoryItems={items}
					onWaybillPosted={fetchItems} onInvoicePosted={fetchItems} getHeaders={getHeaders}
				/>
			)}

			{isBatchActive && (
				<WarehouseBatchWriteoffModal
					isOpen={isBatchActive} onClose={handleCloseBatch}
					organizationId={organizationId} warehouseItems={items} onDeductionComplete={fetchItems}
				/>
			)}

			{externalModalsProps?.isInventoryAuditOpen && (
				<WarehouseInventoryAuditModal
					isOpen={externalModalsProps.isInventoryAuditOpen}
					onClose={externalModalsProps.onCloseInventoryAudit}
					initialDocument={auditInitialDoc} onDocumentSaved={fetchItems}
				/>
			)}

			{externalModalsProps?.isMdlpScanningOpen && (
				<Suspense fallback={null}>
					<MdlpScanningModal
						isOpen={externalModalsProps.isMdlpScanningOpen}
						onClose={externalModalsProps.onCloseMdlpScanning}
					/>
				</Suspense>
			)}
		</div>
	);
};

export default InventoryViewMobileLayout;
