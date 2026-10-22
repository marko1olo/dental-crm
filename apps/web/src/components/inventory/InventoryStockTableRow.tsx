import React from "react";
import type { InventoryItem } from "./inventoryDataMappers.js";
import { StockRowActionsCell } from "./stockTableRow/StockRowActionsCell.js";
import { StockRowFefoCell } from "./stockTableRow/StockRowFefoCell.js";
import { StockRowNameCell } from "./stockTableRow/StockRowNameCell.js";
import { StockRowStockCell } from "./stockTableRow/StockRowStockCell.js";
import { computeStockRowViewModel } from "./stockTableRow/stockRowViewModel.js";

export interface InventoryStockTableRowProps {
	readonly item: InventoryItem;
	readonly writeQty: number;
	readonly onStepQuantity?: ((delta: number) => void) | undefined;
	readonly onChangeQuantity?: ((val: number) => void) | undefined;
	readonly isMenuOpen: boolean;
	readonly menuRef?: React.RefObject<HTMLDivElement | null> | undefined;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeductItem: (item: InventoryItem, qty: number, isOverdraft: boolean) => void;
	readonly onReceiveItem: (item: InventoryItem, qty: number) => void;
	readonly onOpenDisposalModal: (item: InventoryItem) => void;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const InventoryStockTableRow: React.FC<InventoryStockTableRowProps> = ({
	item, writeQty, onStepQuantity, onChangeQuantity,
	isMenuOpen, menuRef, onToggleMenu, onCloseMenu,
	onSelectItem, onDeductItem, onReceiveItem, onOpenDisposalModal,
	onOpenWarehouseManager, onOpenInventoryAudit, onEditItem, onDeleteItem,
}) => {
	const {
		stock, isLowStock, isOverdraft, unitCost, lineValue,
		catInfo, expiryTraffic, fefoInfo,
	} = computeStockRowViewModel(item);

	return (
		<tr
			key={item.id}
			className={`inventory-item-row hover:bg-[var(--paper-soft)] transition-colors ${
				expiryTraffic.isBlocked ? "bg-rose-500/5 dark:bg-rose-950/10" : ""
			}`}
			style={{ borderBottom: "1px solid var(--line)" }}
			data-testid={`stock-row-${item.id}`}
		>
			<StockRowNameCell
				item={item}
				isLowStock={isLowStock}
				isOverdraft={isOverdraft}
				catInfo={catInfo}
				onSelectItem={onSelectItem}
			/>

			<StockRowFefoCell
				item={item}
				expiryTraffic={expiryTraffic}
				fefoInfo={fefoInfo}
			/>

			<StockRowStockCell
				item={item}
				stock={stock}
				isLowStock={isLowStock}
				isOverdraft={isOverdraft}
				unitCost={unitCost}
				lineValue={lineValue}
				onReceiveItem={onReceiveItem}
			/>

			<StockRowActionsCell
				item={item}
				writeQty={writeQty}
				isOverdraft={isOverdraft}
				expiryTraffic={expiryTraffic}
				isMenuOpen={isMenuOpen}
				menuRef={menuRef}
				onStepQuantity={onStepQuantity}
				onChangeQuantity={onChangeQuantity}
				onToggleMenu={onToggleMenu}
				onCloseMenu={onCloseMenu}
				onDeductItem={onDeductItem}
				onReceiveItem={onReceiveItem}
				onOpenDisposalModal={onOpenDisposalModal}
				onOpenWarehouseManager={onOpenWarehouseManager}
				onOpenInventoryAudit={onOpenInventoryAudit}
				onEditItem={onEditItem}
				onDeleteItem={onDeleteItem}
			/>
		</tr>
	);
};

export default InventoryStockTableRow;
