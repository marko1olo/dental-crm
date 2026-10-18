import React from "react";
import { money } from "../../../AppHelpers.js";
import {
	MobileInventoryGroupedList,
	type MobileInventoryCategoryType,
} from "../MobileInventoryGroupedList.js";
import { InventoryItemFormModal } from "../InventoryItemFormModal.js";
import { InventoryConfirmDialog } from "../InventoryConfirmDialog.js";
import { InventoryExternalModals } from "../InventoryExternalModals.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";

export interface InventoryViewMobileLayoutProps {
	readonly items: readonly InventoryItem[];
	readonly organizationId: string;
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly selectedCategory: string;
	readonly setSelectedCategory: (c: any) => void;
	readonly openEditModal: (it: InventoryItem) => void;
	readonly openAddModal: () => void;
	readonly setIsInboundInvoiceModalOpen: (b: boolean) => void;
	readonly setIsAcceptanceWaybillsOpen: (b: boolean) => void;
	readonly handleQuickWriteoffCarpules: () => Promise<any> | void;
	readonly isWritingOffCarpules: boolean;
	readonly fetchItems: () => Promise<void> | void;
	readonly getHeaders: (h?: Record<string, string>) => Record<string, string>;
	readonly showModal: boolean;
	readonly setShowModal: (b: boolean) => void;
	readonly editingItem: InventoryItem | null;
	readonly formData: any;
	readonly setFormData: any;
	readonly handleSaveItem: (e: React.FormEvent) => Promise<void>;
	readonly isSavingItem: boolean;
	readonly confirmDialog: any;
	readonly setConfirmDialog: any;
	readonly externalModalsProps: any;
	readonly auditInitialDoc: WarehouseInventoryAuditDocument;
}

export const InventoryViewMobileLayout: React.FC<InventoryViewMobileLayoutProps> = (props) => {
	const {
		items, organizationId, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
		openEditModal, openAddModal, setIsInboundInvoiceModalOpen, setIsAcceptanceWaybillsOpen,
		handleQuickWriteoffCarpules, isWritingOffCarpules, fetchItems, getHeaders,
		showModal, setShowModal, editingItem, formData, setFormData, handleSaveItem, isSavingItem,
		confirmDialog, setConfirmDialog, externalModalsProps, auditInitialDoc,
	} = props;

	return (
		<div className="w-full h-full flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			<MobileInventoryGroupedList
				items={items}
				organizationId={organizationId}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onClearSearch={() => setSearchQuery("")}
				selectedCategory={selectedCategory === "therapy" || selectedCategory === "composite" ? "filling" : (selectedCategory as MobileInventoryCategoryType)}
				onSelectCategory={(cat) => setSelectedCategory(cat === "filling" ? "composite" : cat)}
				onQuickDeduct={async (item, qty) => {
					const res = await fetch(`/api/inventory/${organizationId}/${item.id}/stock`, {
						method: "PATCH", headers: getHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({ adjustment: -(qty || 1), allowOverdraft: true }),
					});
					if (res.ok) fetchItems();
				}}
				onReceiveItem={async (item, qty, lotNumber, expDate) => {
					const res = await fetch(`/api/inventory/${organizationId}/${item.id}/stock`, {
						method: "PATCH", headers: getHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({ adjustment: qty || 1, allowOverdraft: true, lotNumber, expirationDate: expDate }),
					});
					if (res.ok) fetchItems();
				}}
				onSelectItem={(item) => openEditModal(item)}
				onEditItem={(item) => openEditModal(item)}
				onOpenAddModal={openAddModal}
				onOpenInboundInvoice={() => setIsInboundInvoiceModalOpen(true)}
				onOpenWaybills={() => setIsAcceptanceWaybillsOpen(true)}
				onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
				isWritingOffCarpules={isWritingOffCarpules}
				onRefresh={() => fetchItems()}
				money={money}
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

			<InventoryExternalModals
				organizationId={organizationId} items={items} auditInitialDoc={auditInitialDoc}
				{...externalModalsProps} fetchItems={fetchItems} getHeaders={getHeaders}
				onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
			/>
		</div>
	);
};

export default InventoryViewMobileLayout;
