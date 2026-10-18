import React from "react";
import { InventoryItemFormModal } from "../InventoryItemFormModal.js";
import { InventoryStockAdjustModal } from "../InventoryStockAdjustModal.js";
import { InventoryConfirmDialog } from "../InventoryConfirmDialog.js";
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
}

export const InventoryViewModalsContainer: React.FC<InventoryViewModalsContainerProps> = (props) => {
	const {
		organizationId, items, showModal, setShowModal, editingItem, formData, setFormData,
		handleSaveItem, isSavingItem, adjustingItem, setAdjustingItem, adjustType, setAdjustType,
		adjustAmount, setAdjustAmount, handleAdjustStock, isAdjustingStock, confirmDialog, setConfirmDialog,
		auditInitialDoc, externalModalsProps, isShiftDeductionOpen, setIsShiftDeductionOpen,
		isConsumablesDeductionOpen, setIsConsumablesDeductionOpen, stockMap, fetchItems, getHeaders,
		handleQuickWriteoffCarpules,
	} = props;

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

			<InventoryExternalModals
				organizationId={organizationId} items={items} auditInitialDoc={auditInitialDoc}
				{...externalModalsProps} fetchItems={fetchItems} getHeaders={getHeaders}
				onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
			/>

			<ShiftBatchDeductionModal
				isOpen={isShiftDeductionOpen} onClose={() => setIsShiftDeductionOpen(false)}
				organizationId={organizationId} onDeductionComplete={() => fetchItems()}
			/>

			<ConsumablesDeductionModal
				isOpen={isConsumablesDeductionOpen} onClose={() => setIsConsumablesDeductionOpen(false)}
				procedureTitle="Препарирование и пломба светового отверждения (Filtek / Estelite)"
				serviceCode="A16.07.002.011" service804nCode="A16.07.002.011"
				currentStockMap={stockMap} onConfirmDeduction={() => fetchItems()}
			/>
		</>
	);
};

export default InventoryViewModalsContainer;
