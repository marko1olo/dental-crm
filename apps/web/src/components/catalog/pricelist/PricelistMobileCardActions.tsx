import { Copy, Edit3, ShieldCheck, Trash2 } from "lucide-react";
import type React from "react";
import type { ServicePricelistItem } from "./servicePricelistPresets";

export interface PricelistMobileCardActionsProps {
	readonly item: ServicePricelistItem;
	readonly currentPrice: number;
	readonly onSetZeroWarrantyPrice: (id: string) => void;
	readonly onEditItem: (item: ServicePricelistItem) => void;
	readonly onDuplicateItem: (item: ServicePricelistItem) => void;
	readonly onDeleteItem: (id: string) => void;
}

export const PricelistMobileCardActions: React.FC<
	PricelistMobileCardActionsProps
> = ({
	item,
	currentPrice,
	onSetZeroWarrantyPrice,
	onEditItem,
	onDuplicateItem,
	onDeleteItem,
}) => {
	return (
		<div className="pricelist-mobile-card-actions">
			<button
				type="button"
				className={`pricelist-mobile-action-btn ${currentPrice === 0 ? "active" : ""}`}
				onClick={() => onSetZeroWarrantyPrice(item.id)}
				title="Установить гарантию 0 ₽"
				aria-label="0 ₽ Гарантия"
			>
				<ShieldCheck size={16} />
				<span>0 ₽</span>
			</button>
			<button
				type="button"
				className="pricelist-mobile-action-btn"
				onClick={() => onEditItem(item)}
				title="Редактировать"
				aria-label="Редактировать"
			>
				<Edit3 size={16} />
			</button>
			<button
				type="button"
				className="pricelist-mobile-action-btn"
				onClick={() => onDuplicateItem(item)}
				title="Дублировать"
				aria-label="Дублировать"
			>
				<Copy size={16} />
			</button>
			<button
				type="button"
				className="pricelist-mobile-action-btn danger"
				onClick={() => onDeleteItem(item.id)}
				title="Удалить"
				aria-label="Удалить"
			>
				<Trash2 size={16} />
			</button>
		</div>
	);
};
