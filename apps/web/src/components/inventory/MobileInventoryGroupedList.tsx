import React from "react";
import { showToast } from "../GlobalToast.js";
import { MobileInventoryInboundDrawer } from "./MobileInventoryInboundDrawer.js";
import {
	type MobileInventoryCategoryType,
	type MobileInventoryGroupedListProps,
	matchesCategory,
	getItemCategoryType,
	MOBILE_INVENTORY_CATEGORIES,
	useMobileInventoryLogic,
	MobileInventoryHeaderBar,
	MobileInventoryCategoryChips,
	MobileInventoryItemCard,
	MobileInventoryEmptyState,
	MobileInventoryBottomBar,
} from "./mobileGroupedListModules/index.js";

export type { MobileInventoryCategoryType, MobileInventoryGroupedListProps };
export { matchesCategory, getItemCategoryType, MOBILE_INVENTORY_CATEGORIES };

export const MobileInventoryGroupedList: React.FC<MobileInventoryGroupedListProps> = (props) => {
	const { items, organizationId, searchQuery, onSearchChange, onClearSearch, selectedCategory, onSelectCategory, getHeaders } = props;
	const { onQuickDeduct, onReceiveItem, onSelectItem, onEditItem, onOpenInboundInvoice, onOpenShiftDeduction, onRefresh } = props;
	const logic = useMobileInventoryLogic(items, organizationId, searchQuery, selectedCategory, onQuickDeduct, onReceiveItem, onRefresh, getHeaders);

	const handleSubmitInbound = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!logic.drawerTargetItem) {
			showToast("Выберите материал для пополнения склада", "warning");
			return;
		}
		if (logic.drawerQuantity <= 0) {
			showToast("Укажите количество для оприходования", "warning");
			return;
		}
		logic.setIsSubmittingInbound(true);
		logic.triggerHaptic();
		try {
			if (onReceiveItem) {
				await onReceiveItem(logic.drawerTargetItem, logic.drawerQuantity, logic.drawerLotNumber, logic.drawerExpDate);
				showToast(`Оприходовано ${logic.drawerQuantity} ед. «${logic.drawerTargetItem.name}» на склад`, "success");
			} else {
				const headers = getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" };
				const res = await fetch(`/api/inventory/${organizationId}/${logic.drawerTargetItem.id}/stock`, {
					method: "PATCH",
					headers,
					body: JSON.stringify({
						adjustment: logic.drawerQuantity,
						allowOverdraft: true,
						lotNumber: logic.drawerLotNumber,
						expirationDate: logic.drawerExpDate,
						reason: "Оприходование партии в мобильном интерфейсе",
					}),
				});
				if (res.ok) {
					showToast(`Оприходовано +${logic.drawerQuantity} ед. «${logic.drawerTargetItem.name}»`, "success");
					if (onRefresh) onRefresh();
				} else {
					showToast("Ошибка сохранения партии на складе", "error");
				}
			}
			logic.setIsInboundDrawerOpen(false);
		} catch {
			showToast("Сбой сети при оприходовании партии", "error");
		} finally {
			logic.setIsSubmittingInbound(false);
		}
	};

	return (
		<div className="mobile-inventory-container" data-testid="mobile-inventory-container">
			<MobileInventoryHeaderBar
				totalCount={items.length} lowStockCount={logic.lowStockCount}
				searchQuery={searchQuery} onSearchChange={onSearchChange} onClearSearch={onClearSearch}
				onOpenMdlpScanning={props.onOpenMdlpScanning}
			/>
			<MobileInventoryCategoryChips
				selectedCategory={selectedCategory} categoryCounts={logic.categoryCounts}
				onSelectCategory={onSelectCategory} triggerHaptic={logic.triggerHaptic}
			/>

			{logic.displayItems.length > 0 ? (
				<div className="mobile-inventory-grouped-inset" data-testid="mobile-inventory-grouped-card">
					{logic.displayItems.map((item) => (
						<MobileInventoryItemCard
							key={item.id} item={item} isDeducting={Boolean(logic.deductingItemIds[item.id])}
							onClick={() => {
								logic.triggerHaptic();
								if (onSelectItem) onSelectItem(item);
								else if (onEditItem) onEditItem(item);
								else logic.handleOpenInboundDrawer(item);
							}}
							onQuickDeduct={logic.handleExecuteQuickDeduct}
						/>
					))}
				</div>
			) : (
				<MobileInventoryEmptyState searchQuery={searchQuery} onClearSearch={onClearSearch} />
			)}

			<MobileInventoryBottomBar
				onOpenInboundDrawer={() => logic.handleOpenInboundDrawer()}
				onOpenInboundInvoice={onOpenInboundInvoice}
				onOpenShiftDeduction={onOpenShiftDeduction}
				onOpenMdlpScanning={props.onOpenMdlpScanning}
			/>

			<MobileInventoryInboundDrawer
				isOpen={logic.isInboundDrawerOpen} onClose={() => logic.setIsInboundDrawerOpen(false)}
				drawerTargetItem={logic.drawerTargetItem} items={items}
				drawerQuantity={logic.drawerQuantity} setDrawerQuantity={logic.setDrawerQuantity}
				drawerLotNumber={logic.drawerLotNumber} setDrawerLotNumber={logic.setDrawerLotNumber}
				drawerExpDate={logic.drawerExpDate} setDrawerExpDate={logic.setDrawerExpDate}
				onSelectTargetItem={(found) => { logic.setDrawerTargetItem(found); logic.setDrawerCustomName(found.name); }}
				onSubmitInbound={handleSubmitInbound} isSubmittingInbound={logic.isSubmittingInbound}
				onOpenInboundInvoice={onOpenInboundInvoice} triggerHaptic={logic.triggerHaptic}
			/>
		</div>
	);
};

export default MobileInventoryGroupedList;
