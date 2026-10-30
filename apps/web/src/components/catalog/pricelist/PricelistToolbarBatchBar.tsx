import { Sparkles } from "lucide-react";
import React from "react";
import type { PriceRoundingMode } from "./servicePricelistEngine";
import {
	PRICE_TIER_LABELS,
	type PriceTierKind,
} from "./servicePricelistPresets";

export interface PricelistToolbarBatchBarProps {
	readonly activeTier: PriceTierKind;
	readonly batchRounding: PriceRoundingMode;
	readonly onApplyBatchMarkup: (
		percent: number,
		rounding: PriceRoundingMode,
	) => void;
	readonly onApplyBatchRounding: (rounding: PriceRoundingMode) => void;
}

export const PricelistToolbarBatchBar: React.FC<
	PricelistToolbarBatchBarProps
> = ({
	activeTier,
	batchRounding,
	onApplyBatchMarkup,
	onApplyBatchRounding,
}) => {
	return (
		<div
			className="pricelist-batch-bar"
			style={{ padding: "0.5rem 1.25rem", gap: "0.75rem" }}
		>
			<div className="batch-bar-left">
				<Sparkles size={14} style={{ color: "var(--brand-500)" }} />
				<span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
					Пакетное изменение цен ({PRICE_TIER_LABELS[activeTier]}):
				</span>
			</div>

			<div
				className="batch-bar-actions"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					flexWrap: "wrap",
				}}
			>
				<button
					type="button"
					className="batch-quick-btn"
					style={{ minHeight: "32px" }}
					onClick={() => onApplyBatchMarkup(5, batchRounding)}
				>
					+5%
				</button>
				<button
					type="button"
					className="batch-quick-btn"
					style={{ minHeight: "32px" }}
					onClick={() => onApplyBatchMarkup(10, batchRounding)}
				>
					+10%
				</button>
				<button
					type="button"
					className="batch-quick-btn"
					style={{ minHeight: "32px" }}
					onClick={() => onApplyBatchMarkup(15, batchRounding)}
				>
					+15%
				</button>
				<button
					type="button"
					className="batch-quick-btn"
					style={{ minHeight: "32px" }}
					onClick={() => onApplyBatchMarkup(-10, batchRounding)}
				>
					-10% (Скидка)
				</button>
				<button
					type="button"
					className="batch-quick-btn"
					style={{ minHeight: "32px" }}
					onClick={() => onApplyBatchMarkup(-50, batchRounding)}
					title="Скидка 50%"
				>
					-50%
				</button>
				<button
					type="button"
					className="batch-quick-btn warranty"
					style={{ minHeight: "32px", color: "var(--ok-fg, #10b981)" }}
					onClick={() => onApplyBatchMarkup(-100, batchRounding)}
					title="100% скидка на гарантийные переделки"
				>
					-100% (Гарантия)
				</button>
				<span style={{ color: "var(--line)", margin: "0 0.25rem" }}>|</span>
				<button
					type="button"
					className="batch-quick-btn"
					style={{ minHeight: "32px" }}
					onClick={() => onApplyBatchRounding("round_100")}
				>
					До 100 ₽
				</button>
				<button
					type="button"
					className="batch-quick-btn"
					style={{ minHeight: "32px" }}
					onClick={() => onApplyBatchRounding("round_500")}
				>
					До 500 ₽
				</button>
			</div>
		</div>
	);
};
