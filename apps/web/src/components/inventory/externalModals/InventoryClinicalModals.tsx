import React, { lazy, Suspense } from "react";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";
import type { ClinicalWriteoffDocument } from "../writeoff/clinicalWriteoffEngine.js";
import type { WarehouseTransferDocument } from "../transfers/warehouseTransferEngine.js";

const WarehouseTransferModal = lazy(() =>
	import("../transfers/WarehouseTransferModal.js").then((module) => ({
		default: module.WarehouseTransferModal,
	})),
);
const ConsumablesBatchWriteoffModal = lazy(() =>
	import("../ConsumablesBatchWriteoffModal.js").then((module) => ({
		default: module.ConsumablesBatchWriteoffModal,
	})),
);
const WarehouseInventoryAuditModal = lazy(() =>
	import("../WarehouseInventoryAuditModal.js").then((module) => ({
		default: module.WarehouseInventoryAuditModal,
	})),
);

export interface InventoryClinicalModalsProps {
	readonly isClinicalWriteoffOpen: boolean;
	readonly onCloseClinicalWriteoff: () => void;
	readonly onConfirmClinicalWriteoff: (doc: ClinicalWriteoffDocument) => Promise<void>;
	readonly isWarehouseTransferOpen: boolean;
	readonly onCloseWarehouseTransfer: () => void;
	readonly onDocumentSavedWarehouseTransfer: () => Promise<void>;
	readonly onConfirmWarehouseTransfer: (doc?: WarehouseTransferDocument) => Promise<void>;
	readonly isInventoryAuditOpen: boolean;
	readonly onCloseInventoryAudit: () => void;
	readonly auditInitialDoc: WarehouseInventoryAuditDocument;
	readonly onApplyInventoryAudit: (doc: WarehouseInventoryAuditDocument) => Promise<void>;
	readonly onDocumentSavedInventoryAudit: () => void;
}

export const InventoryClinicalModals: React.FC<InventoryClinicalModalsProps> = ({
	isClinicalWriteoffOpen,
	onCloseClinicalWriteoff,
	onConfirmClinicalWriteoff,
	isWarehouseTransferOpen,
	onCloseWarehouseTransfer,
	onDocumentSavedWarehouseTransfer,
	onConfirmWarehouseTransfer,
	isInventoryAuditOpen,
	onCloseInventoryAudit,
	auditInitialDoc,
	onApplyInventoryAudit,
	onDocumentSavedInventoryAudit,
}) => {
	return (
		<>
			{isClinicalWriteoffOpen && (
				<Suspense fallback={null}>
					<ConsumablesBatchWriteoffModal
						isOpen={isClinicalWriteoffOpen}
						onClose={onCloseClinicalWriteoff}
						onConfirmWriteoff={onConfirmClinicalWriteoff}
					/>
				</Suspense>
			)}

			{isWarehouseTransferOpen && (
				<Suspense fallback={null}>
					<WarehouseTransferModal
						isOpen={isWarehouseTransferOpen}
						onClose={onCloseWarehouseTransfer}
						onDocumentSaved={onDocumentSavedWarehouseTransfer}
						onConfirmTransfer={onConfirmWarehouseTransfer}
					/>
				</Suspense>
			)}

			{isInventoryAuditOpen && (
				<Suspense fallback={null}>
					<WarehouseInventoryAuditModal
						isOpen={isInventoryAuditOpen}
						onClose={onCloseInventoryAudit}
						initialDocument={auditInitialDoc}
						onApplyAudit={onApplyInventoryAudit}
						onDocumentSaved={onDocumentSavedInventoryAudit}
					/>
				</Suspense>
			)}
		</>
	);
};

export default InventoryClinicalModals;
