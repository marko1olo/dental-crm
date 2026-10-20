import type React from "react";
import type { PriceTierKind } from "./servicePricelistPresets";

export interface PricelistToolbarTierControlProps {
	readonly activeTier: PriceTierKind;
	readonly onTierChange: (tier: PriceTierKind) => void;
}

export const PricelistToolbarTierControl: React.FC<
	PricelistToolbarTierControlProps
> = ({ activeTier, onTierChange }) => {
	return (
		<div
			className="pricelist-tier-segmented"
			style={{ padding: "2px", display: "inline-flex" }}
		>
			<button
				type="button"
				style={{
					minHeight: "32px",
					height: "32px",
					padding: "0.25rem 0.625rem",
					fontSize: "0.75rem",
				}}
				className={`tier-segment-btn ${activeTier === "standard" ? "active" : ""}`}
				onClick={() => onTierChange("standard")}
			>
				Основной
			</button>
			<button
				type="button"
				style={{
					minHeight: "32px",
					height: "32px",
					padding: "0.25rem 0.625rem",
					fontSize: "0.75rem",
				}}
				className={`tier-segment-btn ${activeTier === "vip" ? "active" : ""}`}
				onClick={() => onTierChange("vip")}
			>
				VIP (+20%)
			</button>
			<button
				type="button"
				style={{
					minHeight: "32px",
					height: "32px",
					padding: "0.25rem 0.625rem",
					fontSize: "0.75rem",
				}}
				className={`tier-segment-btn ${activeTier === "dms" ? "active" : ""}`}
				onClick={() => onTierChange("dms")}
			>
				ДМС
			</button>
			<button
				type="button"
				style={{
					minHeight: "32px",
					height: "32px",
					padding: "0.25rem 0.625rem",
					fontSize: "0.75rem",
				}}
				className={`tier-segment-btn ${activeTier === "promo" ? "active" : ""}`}
				onClick={() => onTierChange("promo")}
			>
				Промо
			</button>
			<button
				type="button"
				style={{
					minHeight: "32px",
					height: "32px",
					padding: "0.25rem 0.625rem",
					fontSize: "0.75rem",
				}}
				className={`tier-segment-btn ${activeTier === "night_weekend" ? "active" : ""}`}
				onClick={() => onTierChange("night_weekend")}
				title="Тариф в ночные часы и праздничные/выходные дни (+30%)"
			>
				Ночной (+30%)
			</button>
		</div>
	);
};
