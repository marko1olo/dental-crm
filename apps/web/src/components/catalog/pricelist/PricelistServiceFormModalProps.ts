import type { ServicePricelistItem } from "./servicePricelistPresets";

export interface PricelistServiceFormModalProps {
	readonly isOpen: boolean;
	readonly editingItem: ServicePricelistItem | null;
	readonly onClose: () => void;
	readonly onSave: (item: ServicePricelistItem) => void;
}
