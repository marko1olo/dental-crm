import React from "react";
import { InventoryDisposalActModal } from "./InventoryDisposalActModal.js";
import { InventoryMobileCards } from "./InventoryMobileCards.js";
import {
	formatExpDate, getCategoryBadge, getExpiryTrafficLight,
	getFefoTrafficLight, getWarehouseFefoTrafficLight,
	type ExpiryTrafficLightInfo, type ExpiryTrafficStatus, type FefoTrafficLightInfo,
} from "./inventoryExpiryUtils.js";
import { StockTableBody } from "./stockTable/StockTableBody.js";
import { StockTableHeader } from "./stockTable/StockTableHeader.js";
import type { InventoryStockTableProps, WarehouseItemsTableProps } from "./stockTable/types.js";
import { useInventoryTableState } from "./stockTable/useInventoryTableState.js";

export {
	getExpiryTrafficLight, getCategoryBadge, formatExpDate,
	getWarehouseFefoTrafficLight, getFefoTrafficLight,
	type ExpiryTrafficStatus, type ExpiryTrafficLightInfo, type FefoTrafficLightInfo,
	type InventoryStockTableProps, type WarehouseItemsTableProps,
};

export const InventoryStockTable: React.FC<InventoryStockTableProps> = ({
	items, isLoading = false, searchQuery: externalSearchQuery, loadError = null,
	hasMore, remainingCount, onShowMore, onSelectItem, onDeductItem, onReceiveItem,
	onDeleteItem, onEditItem, onCreateDisposalAct, onOpenWaybills, onOpenAddModal,
	onOpenWarehouseManager, onOpenInventoryAudit, onRetry, className = "",
}) => {
	const state = useInventoryTableState(items, externalSearchQuery, onDeductItem, onReceiveItem, onCreateDisposalAct);

	return (
		<div
			className={`inventory-view-table-wrapper inventory-stock-table-container min-h-[36px] ${className}`.trim()}
			style={{
				flex: 1,
				overflowX: "auto",
				overflowY: "auto",
				maxWidth: "100%",
				width: "100%",
				boxSizing: "border-box",
				background: "var(--paper)",
				borderRadius: 8,
				border: "1px solid var(--line)",
			}}
			data-testid="inventory-stock-table"
			role="region"
			aria-label="Складской учет материалов и контроль сроков годности FEFO"
		>
			<div className="inventory-mobile-cards-wrapper block md:hidden p-2.5" data-testid="inventory-mobile-cards-view">
				<InventoryMobileCards
					items={state.filteredItems}
					isLoading={isLoading}
					effectiveSearch={state.effectiveSearch}
					loadError={loadError}
					onSelectItem={onSelectItem}
					onDeductItem={state.handleExecuteDeduct}
					onReceiveItem={state.handleExecuteReceive}
					onOpenWaybills={onOpenWaybills}
					onOpenAddModal={onOpenAddModal}
					onRetry={onRetry}
					onOpenDisposalModal={(item) => state.setDisposalPromptItem(item)}
					onOpenWarehouseManager={onOpenWarehouseManager}
					onOpenInventoryAudit={onOpenInventoryAudit}
					onEditItem={onEditItem}
					onDeleteItem={onDeleteItem}
				/>
			</div>

			<table
				className="inventory-view-table hidden md:table"
				style={{ width: "100%", tableLayout: "auto", borderCollapse: "collapse", textAlign: "left" }}
				data-testid="inventory-view-table"
				role="table"
			>
				<StockTableHeader />
				<StockTableBody
					state={state}
					isLoading={isLoading}
					loadError={loadError}
					onRetry={onRetry}
					onOpenWaybills={onOpenWaybills}
					onOpenAddModal={onOpenAddModal}
					onSelectItem={onSelectItem}
					onOpenWarehouseManager={onOpenWarehouseManager}
					onOpenInventoryAudit={onOpenInventoryAudit}
					onEditItem={onEditItem}
					onDeleteItem={onDeleteItem}
					hasMore={hasMore}
					remainingCount={remainingCount}
					onShowMore={onShowMore}
				/>
			</table>

			{state.disposalPromptItem && (
				<InventoryDisposalActModal
					item={state.disposalPromptItem}
					quantity={state.pendingQuantities[state.disposalPromptItem.id] || 1}
					onClose={() => state.setDisposalPromptItem(null)}
					onConfirm={state.handleExecuteDisposalAct}
				/>
			)}
		</div>
	);
};

export const WarehouseItemsTable = InventoryStockTable;
export default InventoryStockTable;
