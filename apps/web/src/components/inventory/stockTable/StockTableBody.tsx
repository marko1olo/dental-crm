import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { InventoryStockTableRow } from "../InventoryStockTableRow.js";
import { StockTableEmptyState } from "./StockTableEmptyState.js";
import { StockTablePaginationRow } from "./StockTablePaginationRow.js";
import type { useInventoryTableState } from "./useInventoryTableState.js";

export interface StockTableBodyProps {
	readonly state: ReturnType<typeof useInventoryTableState>;
	readonly isLoading: boolean;
	readonly loadError: string | null;
	readonly onRetry?: (() => void) | undefined;
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenAddModal?: (() => void) | undefined;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
	readonly hasMore?: boolean | undefined;
	readonly remainingCount?: number | undefined;
	readonly onShowMore?: (() => void) | undefined;
}

export const StockTableBody: React.FC<StockTableBodyProps> = ({
	state,
	isLoading,
	loadError,
	onRetry,
	onOpenWaybills,
	onOpenAddModal,
	onSelectItem,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onEditItem,
	onDeleteItem,
	hasMore,
	remainingCount,
	onShowMore,
}) => {
	return (
		<tbody>
			{state.filteredItems.length === 0 ? (
				<StockTableEmptyState
					loadError={loadError}
					effectiveSearch={state.effectiveSearch}
					isLoading={isLoading}
					onRetry={onRetry}
					onOpenWaybills={onOpenWaybills}
					onOpenAddModal={onOpenAddModal}
				/>
			) : (
				state.filteredItems.map((item) => (
					<InventoryStockTableRow
						key={item.id}
						item={item}
						writeQty={state.pendingQuantities[item.id] || 1}
						onStepQuantity={(delta) => state.handleStepQuantity(item.id, delta)}
						onChangeQuantity={(val) => state.handleChangeQuantity(item.id, val)}
						isMenuOpen={state.activeMenuRowId === item.id}
						menuRef={state.rowMenuRef}
						onToggleMenu={() =>
							state.setActiveMenuRowId((prev) => (prev === item.id ? null : item.id))
						}
						onCloseMenu={() => state.setActiveMenuRowId(null)}
						onSelectItem={onSelectItem}
						onDeductItem={state.handleExecuteDeduct}
						onReceiveItem={state.handleExecuteReceive}
						onOpenDisposalModal={(targetItem) => state.setDisposalPromptItem(targetItem)}
						onOpenWarehouseManager={onOpenWarehouseManager}
						onOpenInventoryAudit={onOpenInventoryAudit}
						onEditItem={onEditItem}
						onDeleteItem={onDeleteItem}
					/>
				))
			)}
			<StockTablePaginationRow hasMore={hasMore} remainingCount={remainingCount} onShowMore={onShowMore} />
		</tbody>
	);
};

export default StockTableBody;
