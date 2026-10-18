import React from "react";
import type { InventoryItem } from "./useInventoryLogic.js";
import type { WarehouseInventoryAuditDocument } from "./warehouseInventoryEngine.js";
import { useWarehouseInventoryState } from "./auditTab/useWarehouseInventoryState.js";
import { WarehouseInventoryKpis } from "./auditTab/WarehouseInventoryKpis.js";
import { WarehouseInventoryToolbar } from "./auditTab/WarehouseInventoryToolbar.js";
import { WarehouseInventoryTable } from "./auditTab/WarehouseInventoryTable.js";

export interface WarehouseInventoryTabProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly onApplyAudit?: ((doc: WarehouseInventoryAuditDocument) => void | Promise<void>) | undefined;
	readonly onRefresh?: (() => void) | undefined;
}

/**
 * Вкладка складской инвентаризации (ИНВ-3, ИНВ-19, ТОРГ-16) (Мандаты 8e, 8n).
 * Декомпозирована строго <= 120 строк в соответствии с Мандатом 8b.
 * Инвентаризация в 1 клик: кнопка «✓ Подтвердить фактические остатки на смену».
 */
export const WarehouseInventoryTab: React.FC<WarehouseInventoryTabProps> = ({
	organizationId,
	items,
	onApplyAudit,
	onRefresh,
}) => {
	const {
		totals, searchQuery, setSearchQuery, discrepancyOnly, setDiscrepancyOnly,
		isApplying, filteredLines, handleActualQtyChange, handleReconcileAllMatch,
		handleConfirmShiftActuals, handlePrintInv3, handlePrintInv19, handlePrintTorg16, handleApplyAuditDoc,
	} = useWarehouseInventoryState(organizationId, items, onApplyAudit, onRefresh);

	return (
		<div
			className="warehouse-inventory-tab flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2.5"
			data-testid="warehouse-inventory-tab"
		>
			<WarehouseInventoryKpis totals={totals} />

			<WarehouseInventoryToolbar
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				discrepancyOnly={discrepancyOnly}
				onToggleDiscrepancy={() => setDiscrepancyOnly((prev) => !prev)}
				totals={totals}
				onReconcileAllMatch={handleReconcileAllMatch}
				onConfirmShiftActuals={handleConfirmShiftActuals}
				onPrintInv3={handlePrintInv3}
				onPrintInv19={handlePrintInv19}
				onPrintTorg16={handlePrintTorg16}
				onApplyAuditDoc={handleApplyAuditDoc}
				isApplying={isApplying}
			/>

			<WarehouseInventoryTable
				items={items}
				filteredLines={filteredLines}
				onActualQtyChange={handleActualQtyChange}
			/>
		</div>
	);
};

export default WarehouseInventoryTab;
