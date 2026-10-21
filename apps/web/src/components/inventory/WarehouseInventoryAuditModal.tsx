/**
 * WAREHOUSE INVENTORY AUDIT MODAL (ИНВ-3, ИНВ-19, ТОРГ-16 & FEFO)
 * HUD управления инвентаризацией стоматологических расходных материалов,
 * формирования описей ИНВ-3, сличительных ведомостей ИНВ-19 и списания ТОРГ-16.
 * Декомпозирован до <= 120 строк (Мандаты 8b, 8d, 8e).
 */

import type React from "react";
import { createPortal } from "react-dom";
import type {
	WarehouseInventoryAuditDocument,
	WarehouseTorg16WriteoffAct,
} from "./warehouseInventoryEngine.js";
import { WarehouseAuditCategoryBar } from "./auditTab/WarehouseAuditCategoryBar.js";
import { WarehouseAuditFooter } from "./auditTab/WarehouseAuditFooter.js";
import { WarehouseAuditModalHeader } from "./auditTab/WarehouseAuditModalHeader.js";
import { WarehouseAuditToolbar } from "./auditTab/WarehouseAuditToolbar.js";
import { useWarehouseAuditState, type InventoryCategoryFilter } from "./auditTab/useWarehouseAuditState.js";
import { WarehouseInventoryAuditTable } from "./WarehouseInventoryAuditTable.js";
import { WarehouseInventoryKpisGrid } from "./WarehouseInventoryKpisGrid.js";
import "./warehouseInventory.css";

export interface WarehouseInventoryAuditModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDocument?: WarehouseInventoryAuditDocument | undefined;
	readonly onDocumentSaved?: ((doc: WarehouseInventoryAuditDocument) => void) | undefined;
	readonly onApplyAudit?: ((doc: WarehouseInventoryAuditDocument) => void | Promise<void>) | undefined;
	readonly onTorg16Generated?: ((act: WarehouseTorg16WriteoffAct) => void) | undefined;
}

export type { InventoryCategoryFilter };

export const WarehouseInventoryAuditModal: React.FC<WarehouseInventoryAuditModalProps> = ({
	isOpen,
	onClose,
	initialDocument,
	onDocumentSaved,
	onApplyAudit,
	onTorg16Generated,
}) => {
	const state = useWarehouseAuditState({
		isOpen,
		initialDocument,
		onDocumentSaved,
		onApplyAudit,
		onTorg16Generated,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div className="warehouse-inventory-overlay" role="dialog" aria-modal="true">
			<div className="warehouse-inventory-modal">
				<WarehouseAuditModalHeader
					docNumber={state.docNumber}
					orderNumber={state.orderNumber}
					orderDate={state.orderDate}
					warehouseNameRu={state.warehouseNameRu}
					status={state.status}
					currentDocument={state.currentDocument}
					onPrintDocument={state.handlePrintDocument}
					onClose={onClose}
				/>

				<WarehouseInventoryKpisGrid totals={state.totals} />

				<WarehouseAuditCategoryBar
					categoryFilter={state.categoryFilter}
					onSelectCategory={state.setCategoryFilter}
					categoryCounts={state.categoryCounts}
				/>

				<WarehouseAuditToolbar
					searchQuery={state.searchQuery}
					onSearchChange={state.setSearchQuery}
					filterTab={state.filterTab}
					onFilterTabChange={state.setFilterTab}
					totalItemsCount={state.items.length}
					totals={state.totals}
					sortOrder={state.sortOrder}
					onSortOrderChange={state.setSortOrder}
					onAutofillFactByBook={state.handleAutofillFactByBook}
					onCreateTorg16={state.handleCreateTorg16}
				/>

				<WarehouseInventoryAuditTable
					filteredItems={state.filteredItems}
					onQuantityChange={state.handleQuantityChange}
				/>

				<WarehouseAuditFooter
					toastMessage={state.toastMessage}
					molFullName={state.molFullName}
					molPosition={state.molPosition}
					commission={state.commission}
					status={state.status}
					onExportCsv={state.handleExportCsv}
					onExportInv19Csv={state.handleExportInv19Csv}
					onExport1C={state.handleExport1C}
					onSave={state.handleSave}
					onApply={state.handleApply}
				/>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};

export default WarehouseInventoryAuditModal;
