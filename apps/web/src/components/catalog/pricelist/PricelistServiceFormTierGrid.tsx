import type React from "react";

export interface PricelistServiceFormTierGridProps {
	readonly vipPrice: string;
	readonly dmsPrice: string;
	readonly promoPrice: string;
	readonly nightPrice: string;
	readonly onVipPriceChange: (val: string) => void;
	readonly onDmsPriceChange: (val: string) => void;
	readonly onPromoPriceChange: (val: string) => void;
	readonly onNightPriceChange: (val: string) => void;
}

export const PricelistServiceFormTierGrid: React.FC<
	PricelistServiceFormTierGridProps
> = ({
	vipPrice,
	dmsPrice,
	promoPrice,
	nightPrice,
	onVipPriceChange,
	onDmsPriceChange,
	onPromoPriceChange,
	onNightPriceChange,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(4, 1fr)",
				gap: "0.75rem",
				marginTop: "0.75rem",
			}}
		>
			<div>
				<label htmlFor="tier-vip-price" className="pricelist-form-label">
					VIP (+20%)
				</label>
				<input
					id="tier-vip-price"
					type="text"
					inputMode="numeric"
					className="pricelist-search-input"
					style={{ height: "36px" }}
					placeholder="5400"
					value={vipPrice}
					onChange={(e) => onVipPriceChange(e.target.value)}
				/>
			</div>
			<div>
				<label htmlFor="tier-dms-price" className="pricelist-form-label">
					ДМС (страховая)
				</label>
				<input
					id="tier-dms-price"
					type="text"
					inputMode="numeric"
					className="pricelist-search-input"
					style={{ height: "36px" }}
					placeholder="4500"
					value={dmsPrice}
					onChange={(e) => onDmsPriceChange(e.target.value)}
				/>
			</div>
			<div>
				<label htmlFor="tier-promo-price" className="pricelist-form-label">
					Промо (-15%)
				</label>
				<input
					id="tier-promo-price"
					type="text"
					inputMode="numeric"
					className="pricelist-search-input"
					style={{ height: "36px" }}
					placeholder="3825"
					value={promoPrice}
					onChange={(e) => onPromoPriceChange(e.target.value)}
				/>
			</div>
			<div>
				<label htmlFor="tier-night-price" className="pricelist-form-label">
					Ночь (+30%)
				</label>
				<input
					id="tier-night-price"
					type="text"
					inputMode="numeric"
					className="pricelist-search-input"
					style={{ height: "36px" }}
					placeholder="5850"
					value={nightPrice}
					onChange={(e) => onNightPriceChange(e.target.value)}
				/>
			</div>
		</div>
	);
};
