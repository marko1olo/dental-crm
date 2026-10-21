import { Clock } from "lucide-react";
import type React from "react";
import { PricelistMobileCardActions } from "./PricelistMobileCardActions";
import {
	calculateTierPrice,
	formatRubles,
} from "./servicePricelist/currencyMath";
import {
	CATEGORY_LABELS,
	type PriceTierKind,
	type ServicePricelistItem,
	SPECIALTY_LABELS,
} from "./servicePricelistPresets";

export interface PricelistMobileCardProps {
	readonly item: ServicePricelistItem;
	readonly isSelected: boolean;
	readonly activeTier: PriceTierKind;
	readonly onToggleSelectItem: (id: string, checked: boolean) => void;
	readonly onSetZeroWarrantyPrice: (id: string) => void;
	readonly onEditItem: (item: ServicePricelistItem) => void;
	readonly onDuplicateItem: (item: ServicePricelistItem) => void;
	readonly onDeleteItem: (id: string) => void;
}

export const PricelistMobileCard: React.FC<PricelistMobileCardProps> = ({
	item,
	isSelected,
	activeTier,
	onToggleSelectItem,
	onSetZeroWarrantyPrice,
	onEditItem,
	onDuplicateItem,
	onDeleteItem,
}) => {
	const currentPrice = calculateTierPrice(
		item.basePriceRub,
		activeTier,
		item.tierPrices?.[activeTier],
	);

	return (
		<div
			className={`pricelist-mobile-card ${isSelected ? "selected" : ""}`}
			data-testid={`pricelist-mobile-card-${item.id}`}
		>
			<div className="pricelist-mobile-card-header">
				<label className="pricelist-mobile-card-check">
					<input
						type="checkbox"
						checked={isSelected}
						onChange={(e) => onToggleSelectItem(item.id, e.target.checked)}
						aria-label={`Выбрать ${item.commercialTitle}`}
					/>
					<code className="pricelist-mobile-card-code">{item.code804n}</code>
				</label>
				<span className="pricelist-mobile-card-cat">
					{CATEGORY_LABELS[item.category] || item.category}
				</span>
			</div>

			<button
				type="button"
				className="pricelist-mobile-card-body"
				style={{
					background: "transparent",
					border: "none",
					padding: 0,
					textAlign: "left",
					font: "inherit",
					color: "inherit",
					cursor: "pointer",
				}}
				onClick={() => onEditItem(item)}
			>
				<div className="pricelist-mobile-card-title">
					{item.commercialTitle}
				</div>
				{item.statutoryTitle804n &&
					item.statutoryTitle804n !== item.commercialTitle && (
						<div className="pricelist-mobile-card-statutory">
							{item.statutoryTitle804n}
						</div>
					)}
			</button>

			<div className="pricelist-mobile-card-footer">
				<div className="pricelist-mobile-card-meta">
					<span className="pricelist-mobile-card-duration">
						<Clock size={12} /> {item.estimatedDurationMin} мин
					</span>
					<span className="pricelist-mobile-card-spec">
						{SPECIALTY_LABELS[item.specialty] || item.specialty}
					</span>
				</div>

				<div className="pricelist-mobile-card-price-row">
					<div className="pricelist-mobile-card-price">
						{formatRubles(currentPrice)}
					</div>
					<PricelistMobileCardActions
						item={item}
						currentPrice={currentPrice}
						onSetZeroWarrantyPrice={onSetZeroWarrantyPrice}
						onEditItem={onEditItem}
						onDuplicateItem={onDuplicateItem}
						onDeleteItem={onDeleteItem}
					/>
				</div>
			</div>
		</div>
	);
};
