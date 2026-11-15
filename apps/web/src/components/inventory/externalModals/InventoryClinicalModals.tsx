import React, { lazy, Suspense } from "react";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";
import type { ClinicalWriteoffDocument } from "../writeoff/clinicalWriteoffEngine.js";

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
						onConfirmWriteoff={(doc) => {
							if (doc) return onConfirmClinicalWriteoff(doc as ClinicalWriteoffDocument);
						}}
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
