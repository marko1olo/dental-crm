import type React from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";
import type { InventoryItemFormData } from "../InventoryItemFormModal.js";
import type { InventoryCategoryFilter } from "./useInventoryViewCategories.js";

export interface InventoryConfirmDialogState {
	isOpen: boolean;
	title: string;
	message: string;
	onConfirm: () => void;
	confirmLabel?: string;
}

export interface InventoryExternalModalsProps {
	isInboundWaybillOpen?: boolean;
	isInboundInvoiceModalOpen?: boolean;
	isAcceptanceWaybillsOpen?: boolean;
	onCloseInboundInvoiceModal?: () => void;
	onCloseAcceptanceWaybills?: () => void;
	isBatchWriteoffOpen?: boolean;
	isClinicalWriteoffOpen?: boolean;
	isProcedureDeductionOpen?: boolean;
	isWarehouseManagerOpen?: boolean;
	onCloseClinicalWriteoff?: () => void;
	onCloseProcedureDeduction?: () => void;
	onCloseWarehouseManager?: () => void;
	isInventoryAuditOpen?: boolean;
	onCloseInventoryAudit?: () => void;
	onOpenInventoryAudit?: () => void;
	onApplyInventoryAudit?: (doc: WarehouseInventoryAuditDocument) => Promise<void> | void;
	isMdlpScanningOpen?: boolean;
	onCloseMdlpScanning?: () => void;
	onOpenMdlpScanning?: () => void;
	isMdlpDisposalOpen?: boolean;
	onCloseMdlpDisposal?: () => void;
	isDeductingMaterials?: boolean;
	setIsDeductingMaterials?: (isDeducting: boolean) => void;
	isNurseCarpuleModalOpen?: boolean;
	onCloseNurseCarpuleModal?: () => void;
	[key: string]: unknown;
}

export interface InventoryViewMobileLayoutProps {
	readonly items: readonly InventoryItem[];
	readonly organizationId: string;
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly selectedCategory: InventoryCategoryFilter;
	readonly setSelectedCategory:
		| React.Dispatch<React.SetStateAction<InventoryCategoryFilter>>
		| ((c: InventoryCategoryFilter) => void);
	readonly openEditModal: (it: InventoryItem) => void;
	readonly openAddModal: () => void;
	readonly setIsInboundInvoiceModalOpen: (b: boolean) => void;
	readonly setIsAcceptanceWaybillsOpen: (b: boolean) => void;
	readonly handleQuickWriteoffCarpules?:
		| ((options?: { carpulesCount?: number; drugName?: string }) => Promise<void>)
		| undefined;
	readonly isWritingOffCarpules?: boolean | undefined;
	readonly fetchItems: () => Promise<void> | void;
	readonly getHeaders: (h?: Record<string, string>) => Record<string, string>;
	readonly showModal: boolean;
	readonly setShowModal: (b: boolean) => void;
	readonly editingItem: InventoryItem | null;
	readonly formData: InventoryItemFormData;
	readonly setFormData:
		| React.Dispatch<React.SetStateAction<InventoryItemFormData>>
		| ((data: InventoryItemFormData) => void);
	readonly handleSaveItem: (e: React.FormEvent) => Promise<void>;
	readonly isSavingItem: boolean;
	readonly confirmDialog: InventoryConfirmDialogState | null;
	readonly setConfirmDialog:
		| React.Dispatch<React.SetStateAction<InventoryConfirmDialogState | null>>
		| ((val: InventoryConfirmDialogState | null) => void);
	readonly externalModalsProps?: InventoryExternalModalsProps | null | undefined;
	readonly auditInitialDoc: WarehouseInventoryAuditDocument;
	readonly isShiftDeductionOpen?: boolean | undefined;
	readonly setIsShiftDeductionOpen?: ((open: boolean) => void) | undefined;
	readonly onOpenShiftDeduction?: (() => void) | undefined;
}

export async function mobileQuickDeduct(
	organizationId: string,
	itemId: string,
	qty: number | undefined,
	getHeaders: (h?: Record<string, string>) => Record<string, string>,
	fetchItems: () => Promise<void> | void,
) {
	const res = await fetch(`/api/inventory/${organizationId}/${itemId}/stock`, {
		method: "PATCH",
		headers: getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({ adjustment: -(qty || 1), allowOverdraft: true }),
	});
	if (res.ok) fetchItems();
}

export async function mobileReceiveItem(
	organizationId: string,
	itemId: string,
	qty: number | undefined,
	lotNumber: string | undefined,
	expDate: string | undefined,
	getHeaders: (h?: Record<string, string>) => Record<string, string>,
	fetchItems: () => Promise<void> | void,
) {
	const res = await fetch(`/api/inventory/${organizationId}/${itemId}/stock`, {
		method: "PATCH",
		headers: getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			adjustment: qty || 1,
			allowOverdraft: true,
			lotNumber,
			expirationDate: expDate,
		}),
	});
	if (res.ok) fetchItems();
}
