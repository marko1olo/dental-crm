import type React from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";
import type { InventoryItemFormData } from "../InventoryItemFormModal.js";
import type {
	InventoryConfirmDialogState,
	InventoryExternalModalsProps,
} from "./inventoryMobileTypes.js";

export interface InventoryViewModalsContainerProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly showModal: boolean;
	readonly setShowModal: (b: boolean) => void;
	readonly editingItem: InventoryItem | null;
	readonly formData: InventoryItemFormData;
	readonly setFormData:
		| React.Dispatch<React.SetStateAction<InventoryItemFormData>>
		| ((data: InventoryItemFormData) => void);
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
	readonly confirmDialog: InventoryConfirmDialogState | null;
	readonly setConfirmDialog:
		| React.Dispatch<React.SetStateAction<InventoryConfirmDialogState | null>>
		| ((val: InventoryConfirmDialogState | null) => void);
	readonly auditInitialDoc: WarehouseInventoryAuditDocument;
	readonly externalModalsProps?: InventoryExternalModalsProps | null | undefined;
	readonly isShiftDeductionOpen: boolean;
	readonly setIsShiftDeductionOpen: (b: boolean) => void;
	readonly isConsumablesDeductionOpen: boolean;
	readonly setIsConsumablesDeductionOpen: (b: boolean) => void;
	readonly stockMap: Record<string, number>;
	readonly fetchItems: () => Promise<void> | void;
	readonly getHeaders: (h?: Record<string, string>) => Record<string, string>;
	readonly handleQuickWriteoffCarpules: (options?: {
		carpulesCount?: number;
		drugName?: string;
	}) => Promise<void>;
	readonly isInboundWaybillOpen?: boolean | undefined;
	readonly setIsInboundWaybillOpen?: ((b: boolean) => void) | undefined;
	readonly isBatchWriteoffOpen?: boolean | undefined;
	readonly setIsBatchWriteoffOpen?: ((b: boolean) => void) | undefined;
}

export function computeWaybillState(props: InventoryViewModalsContainerProps) {
	const { isInboundWaybillOpen, setIsInboundWaybillOpen, externalModalsProps } =
		props;
	const isWaybillOpen = Boolean(
		isInboundWaybillOpen ||
			externalModalsProps?.isInboundWaybillOpen ||
			externalModalsProps?.isInboundInvoiceModalOpen ||
			externalModalsProps?.isAcceptanceWaybillsOpen,
	);
	const handleCloseWaybill = () => {
		if (setIsInboundWaybillOpen) setIsInboundWaybillOpen(false);
		if (externalModalsProps?.onCloseInboundInvoiceModal)
			externalModalsProps.onCloseInboundInvoiceModal();
		if (externalModalsProps?.onCloseAcceptanceWaybills)
			externalModalsProps.onCloseAcceptanceWaybills();
	};
	return { isWaybillOpen, handleCloseWaybill };
}

export function computeBatchWriteoffState(
	props: InventoryViewModalsContainerProps,
) {
	const {
		isBatchWriteoffOpen,
		setIsBatchWriteoffOpen,
		isShiftDeductionOpen,
		setIsShiftDeductionOpen,
		isConsumablesDeductionOpen,
		setIsConsumablesDeductionOpen,
		externalModalsProps,
	} = props;
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
		if (externalModalsProps?.onCloseClinicalWriteoff)
			externalModalsProps.onCloseClinicalWriteoff();
		if (externalModalsProps?.onCloseProcedureDeduction)
			externalModalsProps.onCloseProcedureDeduction();
		if (externalModalsProps?.onCloseWarehouseManager)
			externalModalsProps.onCloseWarehouseManager();
	};
	return { isBatchOpen, handleCloseBatchWriteoff };
}
