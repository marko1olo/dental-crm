import type React from "react";
import { PricelistDataTableRowActions } from "./PricelistDataTableRowActions";
import { PricelistDataTableRowPrice } from "./PricelistDataTableRowPrice";
import { PricelistDataTableRowTitle } from "./PricelistDataTableRowTitle";
import {
	calculateServiceProfitability,
	calculateTierPrice,
} from "./servicePricelistEngine";
import {
	type PriceTierKind,
	type ServicePricelistItem,
	SPECIALTY_LABELS,
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

export const PricelistDataTableRow: React.FC<PricelistDataTableRowProps> = (
	props,
) => {
	const {
		item,
		isSelected,
		activeTier,
		isEditingPrice,
		editingPriceBuffer,
		onToggleSelectItem,
		onStartEditPrice,
		onPriceBufferChange,
		onCommitPrice,
		onCancelEditPrice,
		onSetZeroWarrantyPrice,
		onEditItem,
		onDuplicateItem,
		onDeleteItem,
	} = props;
	const prof = calculateServiceProfitability(item, activeTier);
	const curPrice = calculateTierPrice(
		item.basePriceRub,
		activeTier,
		item.tierPrices?.[activeTier],
	);

	return (
		<tr
			style={{
				background: isSelected ? "rgba(59, 130, 246, 0.05)" : undefined,
				contain: "content",
				contentVisibility: "auto",
				containIntrinsicSize: "1px 64px",
			}}
		>
			<td style={{ textAlign: "center" }}>
				<input
					type="checkbox"
					checked={isSelected}
					aria-label={`Выбрать услугу ${item.commercialTitle}`}
					onChange={(e) => onToggleSelectItem(item.id, e.target.checked)}
					style={{ cursor: "pointer", width: "18px", height: "18px" }}
				/>
			</td>
			<td>
				<span className="pricelist-code-pill">{item.code804n}</span>
			</td>
			<PricelistDataTableRowTitle item={item} onEditItem={onEditItem} />
			<td>
				<span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
					{SPECIALTY_LABELS[item.specialty] ?? item.specialty}
				</span>
			</td>
			<td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
				<PricelistDataTableRowPrice
					isEditing={isEditingPrice}
					currentPrice={curPrice}
					editingPriceBuffer={editingPriceBuffer}
					onStartEditPrice={() => onStartEditPrice(item.id, curPrice)}
					onPriceBufferChange={onPriceBufferChange}
					onCommitPrice={(val) => onCommitPrice(item.id, val)}
					onCancelEditPrice={onCancelEditPrice}
					onSetZeroWarrantyPrice={() => onSetZeroWarrantyPrice(item.id)}
				/>
			</td>
			<td style={{ textAlign: "center" }}>
				<span className={`margin-badge ${prof.level}`}>
					{prof.marginPercent}%
				</span>
			</td>
			<td
				style={{
					textAlign: "center",
					fontSize: "0.8125rem",
					color: "var(--muted)",
				}}
			>
				{item.estimatedDurationMin} мин
			</td>
			<td style={{ textAlign: "center", width: "100px", whiteSpace: "nowrap" }}>
				<PricelistDataTableRowActions
					item={item}
					onEditItem={onEditItem}
					onDuplicateItem={onDuplicateItem}
					onDeleteItem={onDeleteItem}
				/>
			</td>
		</tr>
	);
};
