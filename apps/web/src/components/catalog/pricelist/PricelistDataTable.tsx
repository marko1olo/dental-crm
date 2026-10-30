import React from "react";
import { PricelistDataTableEmptyAndMore } from "./PricelistDataTableEmptyAndMore";
import { PricelistDataTableHeader } from "./PricelistDataTableHeader";
import type { PricelistDataTableProps } from "./PricelistDataTableProps";
import { PricelistDataTableRow } from "./PricelistDataTableRow";
import { PricelistMobileGroupedList } from "./PricelistMobileGroupedList";

export type { PricelistDataTableProps };

export const PricelistDataTable: React.FC<PricelistDataTableProps> = ({
	filteredCount,
	visibleItems,
	hasMore,
	remainingCount,
	onShowMore,
	selectedItemIds,
	onToggleSelectAll,
	onToggleSelectItem,
	sortField,
	onToggleSort,
	activeTier,
	editingPriceCellId,
	editingPriceBuffer,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitPrice,
	onCancelEditPrice,
	onSetZeroWarrantyPrice,
	onEditItem,
	onDuplicateItem,
	onDeleteItem,
}) => {
	const allSelected =
		visibleItems.length > 0 &&
		visibleItems.every((i) => selectedItemIds.has(i.id));

	return (
		<div className="pricelist-table-container">
			<div className="pricelist-desktop-table-view">
				<table className="pricelist-data-table">
					<PricelistDataTableHeader
						allSelected={allSelected}
						sortField={sortField}
						activeTier={activeTier}
						onToggleSelectAll={onToggleSelectAll}
						onToggleSort={onToggleSort}
					/>
					<tbody>
						{visibleItems.map((item) => (
							<PricelistDataTableRow
								key={item.id}
								item={item}
								isSelected={selectedItemIds.has(item.id)}
								activeTier={activeTier}
								isEditingPrice={editingPriceCellId === item.id}
								editingPriceBuffer={editingPriceBuffer}
								onToggleSelectItem={onToggleSelectItem}
								onStartEditPrice={onStartEditPrice}
								onPriceBufferChange={onPriceBufferChange}
								onCommitPrice={onCommitPrice}
								onCancelEditPrice={onCancelEditPrice}
								onSetZeroWarrantyPrice={onSetZeroWarrantyPrice}
								onEditItem={onEditItem}
								onDuplicateItem={onDuplicateItem}
								onDeleteItem={onDeleteItem}
							/>
						))}
						<PricelistDataTableEmptyAndMore
							hasMore={hasMore}
							remainingCount={remainingCount}
							filteredCount={filteredCount}
							onShowMore={onShowMore}
						/>
					</tbody>
				</table>
			</div>

			<div className="pricelist-mobile-cards-view">
				<PricelistMobileGroupedList
					visibleItems={visibleItems}
					selectedItemIds={selectedItemIds}
					activeTier={activeTier}
					onToggleSelectItem={onToggleSelectItem}
					onSetZeroWarrantyPrice={onSetZeroWarrantyPrice}
					onEditItem={onEditItem}
					onDuplicateItem={onDuplicateItem}
					onDeleteItem={onDeleteItem}
					hasMore={hasMore}
					remainingCount={remainingCount}
					filteredCount={filteredCount}
					onShowMore={onShowMore}
				/>
			</div>
		</div>
	);
};
