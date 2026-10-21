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
