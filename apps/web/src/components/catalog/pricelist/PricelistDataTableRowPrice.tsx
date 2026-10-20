import { Edit3 } from "lucide-react";
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
			<div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
				<input
					type="text"
					inputMode="numeric"
					className="price-input-quick"
					style={{
						width: "90px",
						fontWeight: 600,
						textAlign: "right",
						height: "32px",
						padding: "0 6px",
						borderRadius: "6px",
					}}
					autoFocus
					value={editingPriceBuffer}
					onChange={(e) =>
						onPriceBufferChange(e.target.value.replace(/[^\d]/g, ""))
					}
					onKeyDown={(e) => {
						if (e.key === "Enter") onCommitPrice(editingPriceBuffer);
						else if (e.key === "Escape") onCancelEditPrice();
					}}
					onBlur={() => onCommitPrice(editingPriceBuffer)}
				/>
				<span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>₽</span>
			</div>
		);
	}

	return (
		<div
			className="price-edit-container"
			style={{ justifyContent: "flex-end", gap: "6px" }}
		>
			<button
				type="button"
				onClick={onStartEditPrice}
				title="Кликните для ввода цены с клавиатуры"
				style={{
					background: "transparent",
					border: "1px solid var(--line-subtle, transparent)",
					borderRadius: "6px",
					padding: "4px 8px",
					cursor: "pointer",
					fontWeight: 600,
					minHeight: "32px",
					height: "32px",
					fontSize: "0.875rem",
					color: "var(--ink)",
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
				}}
			>
				<span style={{ fontVariantNumeric: "tabular-nums" }}>
					{formatRubles(currentPrice)}
				</span>
				<Edit3 size={12} style={{ opacity: 0.5 }} />
			</button>

			<button
				type="button"
				className={`batch-quick-btn ${currentPrice === 0 ? "active" : ""}`}
				style={{
					padding: "0 8px",
					fontSize: "0.75rem",
					minHeight: "32px",
					height: "32px",
					minWidth: "40px",
					borderRadius: "6px",
					fontWeight: 600,
					color: currentPrice === 0 ? "var(--ok-fg, #10b981)" : undefined,
					borderColor:
						currentPrice === 0 ? "rgba(16, 185, 129, 0.4)" : undefined,
					background:
						currentPrice === 0 ? "rgba(16, 185, 129, 0.12)" : undefined,
				}}
				onClick={onSetZeroWarrantyPrice}
				title="Установить 0 ₽ (Гарантийная переделка / бесплатная услуга)"
			>
				0 ₽
			</button>
		</div>
	);
};
