import React, { useMemo } from "react";
import { MobileCardsEmptyState } from "./mobileCards/MobileCardsEmptyState.js";
import { MobileStockActionSheet } from "./mobileCards/MobileStockActionSheet.js";
import { MobileStockCard } from "./mobileCards/MobileStockCard.js";
import type { InventoryMobileCardsProps } from "./mobileCards/types.js";
import { useMobileCardsState } from "./mobileCards/useMobileCardsState.js";

export type { InventoryMobileCardsProps };

/**
 * InventoryMobileCards — Grouped List Cards (Apple Health / iOS Settings style).
 * Touch Targets >= 44x44px, Natural Thumb Zone, Soft Overdraft Badges.
 * Декомпозирован до <= 120 строк.
 */
export const InventoryMobileCards: React.FC<InventoryMobileCardsProps> = ({
	items,
	effectiveSearch = "",
	onSelectItem,
	onDeductItem,
	onReceiveItem,
	onOpenWaybills,
	onOpenAddModal,
	onOpenDisposalModal,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onEditItem,
	onDeleteItem,
}) => {
	const state = useMobileCardsState(items, onDeductItem, onReceiveItem);
	const now = useMemo(() => new Date(), []);

	if (items.length === 0) {
		return (
			<MobileCardsEmptyState
				effectiveSearch={effectiveSearch}
				onOpenWaybills={onOpenWaybills}
				onOpenAddModal={onOpenAddModal}
			/>
		);
	}

	return (
		<div className="inventory-mobile-grouped-cards space-y-2.5" data-testid="inventory-mobile-cards-list">
			{items.map((item) => (
				<MobileStockCard
					key={item.id}
					item={item}
					now={now}
					isMenuOpen={state.activeMenuId === item.id}
					onToggleMenu={() =>
						state.setActiveMenuId((prev) => (prev === item.id ? null : item.id))
					}
					onCloseMenu={() => state.setActiveMenuId(null)}
					onSelectItem={onSelectItem}
					onOpenSheet={state.openSheet}
					onOpenDisposalModal={onOpenDisposalModal}
					onOpenWarehouseManager={onOpenWarehouseManager}
					onOpenInventoryAudit={onOpenInventoryAudit}
					onEditItem={onEditItem}
					onDeleteItem={onDeleteItem}
				/>
			))}

			<MobileStockActionSheet
				activeSheetItem={state.activeSheetItem}
				sheetQuantity={state.sheetQuantity}
				isScanInputOpen={state.isScanInputOpen}
				barcodeInputValue={state.barcodeInputValue}
				scanInputRef={state.scanInputRef}
				onClose={state.closeSheet}
				onStepQuantity={state.handleStepQuantity}
				onSetQuantity={state.setSheetQuantity}
				onBarcodeChange={state.setBarcodeInputValue}
				onBarcodeKeyDown={state.handleBarcodeInputKeyDown}
				onOpenScanInput={state.handleOpenScanInput}
				onCloseScanInput={() => state.setIsScanInputOpen(false)}
				onExecuteDeduct={state.handleExecuteDeductInSheet}
				onExecuteReceive={state.handleExecuteReceiveInSheet}
			/>
		</div>
	);
};

export default InventoryMobileCards;
