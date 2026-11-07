/**
 * apps/web/src/components/catalog/PricelistItemDrawer.tsx
 *
 * Тонкий канонический фасад-делегат над PriceItemEditModal (Мандаты 8aq, 8s, 8e).
 * Ликвидирует параллельное дублирование модалок редактирования прейскуранта клиники.
 */

import React from "react";
import { PriceItemEditModal } from "../settings/pricesTab/PriceItemEditModal";
import type {
	PricelistCategoryKey,
	PricelistStudioItem,
} from "./pricelistCatalogData";

export interface PricelistItemDrawerProps {
	readonly isOpen: boolean;
	readonly editingItem: PricelistStudioItem | null;
	readonly formCode: string;
	readonly formTitle: string;
	readonly formCategory: PricelistCategoryKey;
	readonly formPriceRub: string;
	readonly formCostRub: string;
	readonly formDuration: string;
	readonly onCodeChange: (val: string) => void;
	readonly onTitleChange: (val: string) => void;
	readonly onCategoryChange: (cat: PricelistCategoryKey) => void;
	readonly onPriceChange: (val: string) => void;
	readonly onCostChange: (val: string) => void;
	readonly onDurationChange: (val: string) => void;
	readonly onClose: () => void;
	readonly onSubmit: (e: React.FormEvent) => void;
}

export const PricelistItemDrawer: React.FC<PricelistItemDrawerProps> = (props) => {
	return <PriceItemEditModal {...props} />;
};

export default PricelistItemDrawer;
