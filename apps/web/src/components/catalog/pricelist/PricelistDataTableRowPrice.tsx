import { Check, Edit3 } from "lucide-react";
import type React from "react";
import { formatRubles } from "./servicePricelistEngine";

export interface PricelistDataTableRowPriceProps {
	readonly isEditing: boolean;
	readonly currentPrice: number;
	readonly editingPriceBuffer: string;
	readonly onStartEditPrice: () => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitPrice: (rawInput: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onSetZeroWarrantyPrice: () => void;
}

export const PricelistDataTableRowPrice: React.FC<
	PricelistDataTableRowPriceProps
> = ({
	isEditing,
	currentPrice,
	editingPriceBuffer,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitPrice,
	onCancelEditPrice,
	onSetZeroWarrantyPrice,
}) => {
	if (isEditing) {
		return (
			<div className="pricelist-price-edit-wrap">
				<input
					type="text"
					inputMode="numeric"
					className="price-input-quick"
					value={editingPriceBuffer}
					onChange={(e) =>
						onPriceBufferChange(e.target.value.replace(/[^\d]/g, ""))
					}
					onKeyDown={(e) => {
						if (e.key === "Enter") onCommitPrice(editingPriceBuffer);
						else if (e.key === "Escape") onCancelEditPrice();
					}}
					onBlur={() => onCommitPrice(editingPriceBuffer)}
					autoFocus
				/>
				<span className="pricelist-price-currency">₽</span>
				<button
					type="button"
					className="pricelist-btn-icon-subtle"
					onClick={() => onCommitPrice(editingPriceBuffer)}
					title="Применить цену"
					aria-label="Применить цену"
				>
					<Check size={14} />
				</button>
			</div>
		);
	}

	return (
		<div className="pricelist-price-cell">
			<button
				type="button"
				onClick={onStartEditPrice}
				title="Кликните для изменения цены"
				className="pricelist-price-display-btn"
			>
				<span className="pricelist-price-value">
					{formatRubles(currentPrice)}
				</span>
				<Edit3 size={12} className="pricelist-price-edit-icon" />
			</button>

			{currentPrice === 0 ? (
				<span className="pricelist-zero-badge" title="Гарантийная позиция (0 ₽)">
					0 ₽
				</span>
			) : (
				<button
					type="button"
					className="pricelist-zero-hover-btn"
					onClick={onSetZeroWarrantyPrice}
					title="Сделать бесплатной (0 ₽ Гарантия)"
					aria-label="Установить 0 ₽ Гарантия"
				>
					0 ₽
				</button>
			)}
		</div>
	);
};
