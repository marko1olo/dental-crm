import React from 'react';
import { PricelistCategorySidebar } from './PricelistCategorySidebar';
import { PricelistDataTable } from './PricelistDataTable';
import type { useServicePricelistManager } from './useServicePricelistManager';

export interface PricelistManagerContentProps {
	readonly mgr: ReturnType<typeof useServicePricelistManager>;
}

export const PricelistManagerContent: React.FC<PricelistManagerContentProps> = ({ mgr }) => {
	return (
		<div className="pricelist-main-layout">
			<PricelistCategorySidebar
				selectedCategory={mgr.selectedCategory}
				onSelectCategory={mgr.setSelectedCategory}
				categoryCounts={mgr.filterSlice.categoryCounts}
			/>
			<PricelistDataTable
				filteredCount={mgr.filterSlice.filteredItems.length}
				visibleItems={mgr.filterSlice.pricelistSlice.visibleItems}
				hasMore={mgr.filterSlice.pricelistSlice.hasMore}
				remainingCount={mgr.filterSlice.pricelistSlice.remainingCount}
				onShowMore={mgr.filterSlice.handleShowMore}
				selectedItemIds={mgr.selectedItemIds}
				onToggleSelectAll={(chk) =>
					mgr.setSelectedItemIds(chk ? new Set(mgr.filterSlice.filteredItems.map((i) => i.id)) : new Set())
				}
				onToggleSelectItem={(id, chk) => {
					const next = new Set(mgr.selectedItemIds);
					if (chk) next.add(id); else next.delete(id);
					mgr.setSelectedItemIds(next);
				}}
				sortField={mgr.sortField}
				onToggleSort={mgr.handleToggleSort}
				activeTier={mgr.activeTier}
				editingPriceCellId={mgr.editingPriceCellId}
				editingPriceBuffer={mgr.editingPriceBuffer}
				onStartEditPrice={(id, p) => {
					mgr.setEditingPriceCellId(id);
					mgr.setEditingPriceBuffer(String(p));
				}}
				onPriceBufferChange={mgr.setEditingPriceBuffer}
				onCommitPrice={mgr.handleCommitInlinePrice}
				onCancelEditPrice={() => mgr.setEditingPriceCellId(null)}
				onSetZeroWarrantyPrice={mgr.handleSetZeroWarrantyPrice}
				onEditItem={(it) => {
					mgr.setEditingItem(it);
					mgr.setIsEditModalOpen(true);
				}}
				onDuplicateItem={(it) =>
					mgr.updateAndPersist([
						{ ...it, id: `srv-dup-${Date.now()}`, commercialTitle: `${it.commercialTitle} (копия)` },
						...mgr.items,
					])
				}
				onDeleteItem={(id) => mgr.updateAndPersist(mgr.items.filter((i) => i.id !== id))}
			/>
		</div>
	);
};
