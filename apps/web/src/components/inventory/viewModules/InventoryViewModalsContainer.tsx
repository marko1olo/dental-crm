import React from "react";
import { InventoryItemFormModal } from "../InventoryItemFormModal.js";
import { InventoryStockAdjustModal } from "../InventoryStockAdjustModal.js";
import { InventoryConfirmDialog } from "../InventoryConfirmDialog.js";
import { InboundWaybillModal } from "../InboundWaybillModal.js";
import { ConsumablesBatchWriteoffModal } from "../ConsumablesBatchWriteoffModal.js";
import { WarehouseInventoryAuditModal } from "../WarehouseInventoryAuditModal.js";
import { InventoryExternalModals } from "../InventoryExternalModals.js";
import {
	computeBatchWriteoffState,
	computeWaybillState,
	type InventoryViewModalsContainerProps,
} from "./inventoryModalsState.js";

export type { InventoryViewModalsContainerProps };

export const InventoryViewModalsContainer: React.FC<InventoryViewModalsContainerProps> = (props) => {
	const {
		organizationId, items, showModal, setShowModal, editingItem, formData, setFormData,
		handleSaveItem, isSavingItem, adjustingItem, setAdjustingItem, adjustType, setAdjustType,
		adjustAmount, setAdjustAmount, handleAdjustStock, isAdjustingStock, confirmDialog, setConfirmDialog,
		auditInitialDoc, externalModalsProps, isConsumablesDeductionOpen, stockMap, fetchItems,
		getHeaders, handleQuickWriteoffCarpules,
	} = props;

	const { isWaybillOpen, handleCloseWaybill } = computeWaybillState(props);
	const { isBatchOpen, handleCloseBatchWriteoff } = computeBatchWriteoffState(props);

	return (
		<>
			<InventoryItemFormModal
				isOpen={showModal} onClose={() => setShowModal(false)}
				editingItem={editingItem} formData={formData} setFormData={setFormData}
				onSubmit={handleSaveItem} isSaving={isSavingItem}
			/>

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

			{isWaybillOpen && (
				<InboundWaybillModal
					isOpen={isWaybillOpen}
					onClose={handleCloseWaybill}
					organizationId={organizationId}
					inventoryItems={items}
					onWaybillPosted={async () => {
						if (fetchItems) await fetchItems();
					}}
					getHeaders={getHeaders}
				/>
			)}

			{isBatchOpen && (
				<ConsumablesBatchWriteoffModal
					isOpen={isBatchOpen} onClose={handleCloseBatchWriteoff}
					organizationId={organizationId} currentStockMap={stockMap}
					warehouseItems={items} onDeductionComplete={fetchItems}
					procedureTitle={isConsumablesDeductionOpen ? "Препарирование и пломба светового отверждения (Filtek / Estelite)" : undefined}
					serviceCode={isConsumablesDeductionOpen ? "A16.07.002.011" : undefined}
				/>
			)}

			{externalModalsProps?.isInventoryAuditOpen && (
				<WarehouseInventoryAuditModal
					isOpen={externalModalsProps.isInventoryAuditOpen}
					onClose={externalModalsProps.onCloseInventoryAudit ?? (() => {})}
					initialDocument={auditInitialDoc}
					onApplyAudit={async (doc) => {
						if (externalModalsProps.onApplyInventoryAudit) {
							await externalModalsProps.onApplyInventoryAudit(doc);
						}
					}}
					onDocumentSaved={fetchItems}
				/>
			)}

			<InventoryExternalModals
				{...externalModalsProps}
				organizationId={organizationId}
				items={items}
				auditInitialDoc={auditInitialDoc}
				isClinicalWriteoffOpen={false}
				onCloseClinicalWriteoff={() => {
					externalModalsProps?.onCloseClinicalWriteoff?.();
				}}
				isInventoryAuditOpen={false}
				onCloseInventoryAudit={() => {
					externalModalsProps?.onCloseInventoryAudit?.();
				}}
				isMdlpDisposalOpen={Boolean(
					externalModalsProps?.isMdlpDisposalOpen,
				)}
				onCloseMdlpDisposal={() => {
					externalModalsProps?.onCloseMdlpDisposal?.();
				}}
				isWarehouseManagerOpen={false}
				onCloseWarehouseManager={() => {
					externalModalsProps?.onCloseWarehouseManager?.();
				}}
				isMdlpScanningOpen={Boolean(
					externalModalsProps?.isMdlpScanningOpen,
				)}
				onCloseMdlpScanning={() => {
					externalModalsProps?.onCloseMdlpScanning?.();
				}}
				isAcceptanceWaybillsOpen={false}
				onCloseAcceptanceWaybills={() => {
					externalModalsProps?.onCloseAcceptanceWaybills?.();
				}}
				isInboundInvoiceModalOpen={false}
				onCloseInboundInvoiceModal={() => {
					externalModalsProps?.onCloseInboundInvoiceModal?.();
				}}
				isDeductingMaterials={Boolean(
					externalModalsProps?.isDeductingMaterials,
				)}
				setIsDeductingMaterials={(isDeducting: boolean) => {
					externalModalsProps?.setIsDeductingMaterials?.(isDeducting);
				}}
				fetchItems={fetchItems}
				getHeaders={getHeaders}
				onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
			/>
		</>
	);
};

export default InventoryViewModalsContainer;
