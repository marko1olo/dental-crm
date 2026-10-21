import { AlertCircle } from "lucide-react";
import type React from "react";
import { PricelistMobileCard } from "./PricelistMobileCard";
import type {
	PriceTierKind,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export interface PricelistMobileGroupedListProps {
	readonly visibleItems: readonly ServicePricelistItem[];
	readonly selectedItemIds: Set<string>;
	readonly activeTier: PriceTierKind;
	readonly onToggleSelectItem: (id: string, checked: boolean) => void;
	readonly onSetZeroWarrantyPrice: (id: string) => void;
	readonly onEditItem: (item: ServicePricelistItem) => void;
	readonly onDuplicateItem: (item: ServicePricelistItem) => void;
	readonly onDeleteItem: (id: string) => void;
	readonly hasMore: boolean;
	readonly remainingCount: number;
	readonly filteredCount: number;
	readonly onShowMore: () => void;
}

export const PricelistMobileGroupedList: React.FC<
	PricelistMobileGroupedListProps
> = ({
	visibleItems,
	selectedItemIds,
	activeTier,
	onToggleSelectItem,
	onSetZeroWarrantyPrice,
	onEditItem,
	onDuplicateItem,
	onDeleteItem,
	hasMore,
	remainingCount,
	filteredCount,
	onShowMore,
}) => {
	if (filteredCount === 0) {
		return (
			<div className="pricelist-mobile-empty-state">
				<AlertCircle size={36} style={{ opacity: 0.5 }} />
				<div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
					Позиции по запросу не найдены
				</div>
				<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
					Измените строку поиска или выберите другой раздел каталога
				</div>
			</div>
		);
	}

	return (
		<div
			className="pricelist-mobile-grouped-list"
			data-testid="pricelist-mobile-list"
		>
			{visibleItems.map((item) => (
				<PricelistMobileCard
					key={item.id}
					item={item}
					isSelected={selectedItemIds.has(item.id)}
					activeTier={activeTier}
					onToggleSelectItem={onToggleSelectItem}
					onSetZeroWarrantyPrice={onSetZeroWarrantyPrice}
					onEditItem={onEditItem}
					onDuplicateItem={onDuplicateItem}
					onDeleteItem={onDeleteItem}
				/>
			))}

			{hasMore && (
				<div className="pricelist-mobile-more-wrap">
					<button
						type="button"
						className="pricelist-btn pricelist-btn-primary"
						onClick={onShowMore}
						style={{ minHeight: "44px", width: "100%", fontWeight: 600 }}
					>
						Показать ещё 40 услуг (осталось {remainingCount})
					</button>
				</div>
			)}
		</div>
	);
};
