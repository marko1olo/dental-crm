import type React from "react";
import { PricelistDataTableEmptyAndMore } from "./PricelistDataTableEmptyAndMore";
import { PricelistDataTableHeader } from "./PricelistDataTableHeader";
import { PricelistDataTableRow } from "./PricelistDataTableRow";
import type { PricelistSortField } from "./servicePricelistEngine";
import type {
	PriceTierKind,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export interface PricelistDataTableProps {
	readonly filteredCount: number;
	readonly visibleItems: readonly ServicePricelistItem[];
	readonly hasMore: boolean;
	readonly remainingCount: number;
	readonly onShowMore: () => void;
	readonly selectedItemIds: Set<string>;
	readonly onToggleSelectAll: (checked: boolean) => void;
	readonly onToggleSelectItem: (id: string, checked: boolean) => void;
	readonly sortField: PricelistSortField;
	readonly onToggleSort: (field: PricelistSortField) => void;
	readonly activeTier: PriceTierKind;
	readonly editingPriceCellId: string | null;
	readonly editingPriceBuffer: string;
	readonly onStartEditPrice: (id: string, currentPrice: number) => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitPrice: (id: string, rawInput: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onSetZeroWarrantyPrice: (id: string) => void;
	readonly onEditItem: (item: ServicePricelistItem) => void;
	readonly onDuplicateItem: (item: ServicePricelistItem) => void;
	readonly onDeleteItem: (id: string) => void;
}

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
	);
};
