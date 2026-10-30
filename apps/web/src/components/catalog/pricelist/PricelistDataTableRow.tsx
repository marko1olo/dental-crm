import React from "react";
import { PricelistDataTableRowActions } from "./PricelistDataTableRowActions";
import { PricelistDataTableRowPrice } from "./PricelistDataTableRowPrice";
import type { PricelistDataTableRowProps } from "./PricelistDataTableRowProps";
import { PricelistDataTableRowTitle } from "./PricelistDataTableRowTitle";
import {
	calculateServiceProfitability,
	calculateTierPrice,
} from "./servicePricelistEngine";
import { SPECIALTY_LABELS } from "./servicePricelistPresets";

export type { PricelistDataTableRowProps };

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
			className={isSelected ? "pricelist-row-selected" : undefined}
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
				<span className="pricelist-code-pill">
					{item.statutoryCode || item.code804n}
				</span>
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
				{prof.totalCostRub > 0 ? (
					<span className={`margin-badge ${prof.level}`}>
						{Number.isFinite(prof.marginPercent) ? prof.marginPercent : 0}%
					</span>
				) : (
					<span className="margin-badge neutral" title="Себестоимость не задана">
						—
					</span>
				)}
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
