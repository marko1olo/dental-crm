import type {
	PriceTierKind,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export interface PricelistDataTableRowProps {
	readonly item: ServicePricelistItem;
	readonly isSelected: boolean;
	readonly activeTier: PriceTierKind;
	readonly isEditingPrice: boolean;
	readonly editingPriceBuffer: string;
	readonly onToggleSelectItem: (id: string, checked: boolean) => void;
	readonly onStartEditPrice: (id: string, currentPrice: number) => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitPrice: (id: string, rawInput: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onSetZeroWarrantyPrice: (id: string) => void;
	readonly onEditItem: (item: ServicePricelistItem) => void;
	readonly onDuplicateItem: (item: ServicePricelistItem) => void;
	readonly onDeleteItem: (id: string) => void;
}
