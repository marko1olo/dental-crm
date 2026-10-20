import { Copy, Edit3, Trash2 } from "lucide-react";
import type React from "react";
import type { ServicePricelistItem } from "./servicePricelistPresets";

export interface PricelistDataTableRowActionsProps {
	readonly item: ServicePricelistItem;
	readonly onEditItem: (item: ServicePricelistItem) => void;
	readonly onDuplicateItem: (item: ServicePricelistItem) => void;
	readonly onDeleteItem: (id: string) => void;
}

export const PricelistDataTableRowActions: React.FC<
	PricelistDataTableRowActionsProps
> = ({ item, onEditItem, onDuplicateItem, onDeleteItem }) => {
	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "4px",
			}}
		>
			<button
				type="button"
				className="pricelist-btn pricelist-btn-icon"
				style={{ width: "32px", height: "32px", minHeight: "32px", padding: 0 }}
				onClick={() => onEditItem(item)}
				title="Редактировать карточку услуги"
			>
				<Edit3 size={14} />
			</button>
			<button
				type="button"
				className="pricelist-btn pricelist-btn-icon"
				style={{ width: "32px", height: "32px", minHeight: "32px", padding: 0 }}
				onClick={() => onDuplicateItem(item)}
				title="Создать копию услуги"
			>
				<Copy size={14} />
			</button>
			<button
				type="button"
				className="pricelist-btn pricelist-btn-icon"
				style={{
					width: "32px",
					height: "32px",
					minHeight: "32px",
					padding: 0,
					color: "var(--alert-fg, #ef4444)",
				}}
				onClick={() => onDeleteItem(item.id)}
				title="Удалить услугу"
			>
				<Trash2 size={14} />
			</button>
		</div>
	);
};
