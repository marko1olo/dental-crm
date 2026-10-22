import React from "react";
import { InventoryItemFormModal } from "../InventoryItemFormModal.js";
import { InventoryStockAdjustModal } from "../InventoryStockAdjustModal.js";
import { InventoryConfirmDialog } from "../InventoryConfirmDialog.js";
import { InboundWaybillModal } from "../InboundWaybillModal.js";
import { WarehouseBatchWriteoffModal } from "../WarehouseBatchWriteoffModal.js";
import { WarehouseInventoryAuditModal } from "../WarehouseInventoryAuditModal.js";
import { InventoryExternalModals } from "../InventoryExternalModals.js";
import { ShiftBatchDeductionModal } from "../ShiftBatchDeductionModal.js";
import { ConsumablesDeductionModal } from "../ConsumablesDeductionModal.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";

export interface InventoryViewModalsContainerProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly showModal: boolean;
	readonly setShowModal: (b: boolean) => void;
	readonly editingItem: InventoryItem | null;
	readonly formData: any;
	readonly setFormData: any;
	readonly handleSaveItem: (e: React.FormEvent) => Promise<void>;
	readonly isSavingItem: boolean;
	readonly adjustingItem: InventoryItem | null;
	readonly setAdjustingItem: (it: InventoryItem | null) => void;
	readonly adjustType: "in" | "out";
	readonly setAdjustType: (t: "in" | "out") => void;
	readonly adjustAmount: string;
	readonly setAdjustAmount: (a: string) => void;
	readonly handleAdjustStock: (e: React.FormEvent) => Promise<void>;
	readonly isAdjustingStock: boolean;
	readonly confirmDialog: any;
	readonly setConfirmDialog: any;
	readonly auditInitialDoc: WarehouseInventoryAuditDocument;
	readonly externalModalsProps: any;
	readonly isShiftDeductionOpen: boolean;
	readonly setIsShiftDeductionOpen: (b: boolean) => void;
	readonly isConsumablesDeductionOpen: boolean;
	readonly setIsConsumablesDeductionOpen: (b: boolean) => void;
	readonly stockMap: Record<string, number>;
	readonly fetchItems: () => Promise<void> | void;
	readonly getHeaders: (h?: Record<string, string>) => Record<string, string>;
	readonly handleQuickWriteoffCarpules: () => Promise<any> | void;
	readonly isInboundWaybillOpen?: boolean;
	readonly setIsInboundWaybillOpen?: (b: boolean) => void;
	readonly isBatchWriteoffOpen?: boolean;
	readonly setIsBatchWriteoffOpen?: (b: boolean) => void;
}

/**
 * Контейнер модальных окон склада (Мандаты 8e, 8n, 8am, 8x).
 * 3 Канонических SSOT: InboundWaybillModal, WarehouseBatchWriteoffModal, WarehouseInventoryAuditModal.
 */
export const InventoryViewModalsContainer: React.FC<InventoryViewModalsContainerProps> = (props) => {
	const {
		organizationId, items, showModal, setShowModal, editingItem, formData, setFormData,
		handleSaveItem, isSavingItem, adjustingItem, setAdjustingItem, adjustType, setAdjustType,
		adjustAmount, setAdjustAmount, handleAdjustStock, isAdjustingStock, confirmDialog, setConfirmDialog,
		auditInitialDoc, externalModalsProps, isShiftDeductionOpen, setIsShiftDeductionOpen,
		isConsumablesDeductionOpen, setIsConsumablesDeductionOpen, stockMap, fetchItems, getHeaders,
		handleQuickWriteoffCarpules, isInboundWaybillOpen, setIsInboundWaybillOpen,
		isBatchWriteoffOpen, setIsBatchWriteoffOpen,
	} = props;

	const isWaybillOpen = Boolean(
		isInboundWaybillOpen ||
		externalModalsProps?.isInboundWaybillOpen ||
		externalModalsProps?.isInboundInvoiceModalOpen ||
		externalModalsProps?.isAcceptanceWaybillsOpen,
	);

	const handleCloseWaybill = () => {
		if (setIsInboundWaybillOpen) setIsInboundWaybillOpen(false);
		if (externalModalsProps?.onCloseInboundInvoiceModal) externalModalsProps.onCloseInboundInvoiceModal();
		if (externalModalsProps?.onCloseAcceptanceWaybills) externalModalsProps.onCloseAcceptanceWaybills();
	};

	const isBatchOpen = Boolean(
		isBatchWriteoffOpen ||
		isShiftDeductionOpen ||
		isConsumablesDeductionOpen ||
		externalModalsProps?.isBatchWriteoffOpen ||
		externalModalsProps?.isClinicalWriteoffOpen ||
		externalModalsProps?.isProcedureDeductionOpen ||
		externalModalsProps?.isWarehouseManagerOpen,
	);

	const handleCloseBatchWriteoff = () => {
		if (setIsBatchWriteoffOpen) setIsBatchWriteoffOpen(false);
		setIsShiftDeductionOpen(false);
		setIsConsumablesDeductionOpen(false);
		if (externalModalsProps?.onCloseClinicalWriteoff) externalModalsProps.onCloseClinicalWriteoff();
		if (externalModalsProps?.onCloseProcedureDeduction) externalModalsProps.onCloseProcedureDeduction();
		if (externalModalsProps?.onCloseWarehouseManager) externalModalsProps.onCloseWarehouseManager();
	};

	return (
		<>
			{/* CRUD номенклатуры */}
			<InventoryItemFormModal
				isOpen={showModal} onClose={() => setShowModal(false)}
				editingItem={editingItem} formData={formData} setFormData={setFormData}
				onSubmit={handleSaveItem} isSaving={isSavingItem}
			/>

			{/* Корректировка остатка */}
			<InventoryStockAdjustModal
				adjustingItem={adjustingItem} onClose={() => setAdjustingItem(null)}
				adjustType={adjustType} setAdjustType={setAdjustType}
				adjustAmount={adjustAmount} setAdjustAmount={setAdjustAmount}
				onAdjustSubmit={handleAdjustStock} isAdjusting={isAdjustingStock}
			/>

			{confirmDialog?.isOpen && (
				<InventoryConfirmDialog
					title={confirmDialog.title} message={confirmDialog.message}
					onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)}
				/>
			)}

			{/* 1. SSOT: Приходная накладная */}
			{isWaybillOpen && (
				<InboundWaybillModal
					isOpen={isWaybillOpen}
					onClose={handleCloseWaybill}
					organizationId={organizationId}
					inventoryItems={items}
					onWaybillPosted={fetchItems}
					onInvoicePosted={fetchItems}
					getHeaders={getHeaders}
				/>
			)}

			{/* 2. SSOT: Пакетное списание расходников за смену/визит */}
			{isBatchOpen && (
				<WarehouseBatchWriteoffModal
					isOpen={isBatchOpen}
					onClose={handleCloseBatchWriteoff}
					organizationId={organizationId}
					currentStockMap={stockMap}
					warehouseItems={items}
					onDeductionComplete={fetchItems}
					procedureTitle={isConsumablesDeductionOpen ? "Препарирование и пломба светового отверждения (Filtek / Estelite)" : undefined}
					serviceCode={isConsumablesDeductionOpen ? "A16.07.002.011" : undefined}
				/>
			)}

			{/* 3. SSOT: Инвентаризация остатков склада */}
			{externalModalsProps?.isInventoryAuditOpen && (
				<WarehouseInventoryAuditModal
					isOpen={externalModalsProps.isInventoryAuditOpen}
					onClose={externalModalsProps.onCloseInventoryAudit}
					initialDocument={auditInitialDoc}
					onApplyAudit={async (doc) => {
						if (externalModalsProps.onApplyInventoryAudit) {
							await externalModalsProps.onApplyInventoryAudit(doc);
						}
					}}
					onDocumentSaved={fetchItems}
				/>
			)}

			{/* Редкие служебные модалки (перемещение/МДЛП) */}
			<InventoryExternalModals
				organizationId={organizationId} items={items} auditInitialDoc={auditInitialDoc}
				{...externalModalsProps}
				isInboundInvoiceModalOpen={false}
				isAcceptanceWaybillsOpen={false}
				isClinicalWriteoffOpen={false}
				isWarehouseManagerOpen={false}
				isInventoryAuditOpen={false}
				fetchItems={fetchItems} getHeaders={getHeaders}
				onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
			/>
		</>
	);
};

export default InventoryViewModalsContainer;
