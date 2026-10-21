import { Sparkles } from "lucide-react";
import type React from "react";
import { PricelistServiceFormTierGrid } from "./PricelistServiceFormTierGrid";

export interface PricelistServiceFormTierFieldsProps {
	readonly showTiers: boolean;
	readonly vipPrice: string;
	readonly dmsPrice: string;
	readonly promoPrice: string;
	readonly nightPrice: string;
	readonly onToggleShowTiers: () => void;
	readonly onVipPriceChange: (val: string) => void;
	readonly onDmsPriceChange: (val: string) => void;
	readonly onPromoPriceChange: (val: string) => void;
	readonly onNightPriceChange: (val: string) => void;
	readonly onAutoRecalculate: () => void;
}

export const PricelistServiceFormTierFields: React.FC<
	PricelistServiceFormTierFieldsProps
> = (props) => {
	const {
		showTiers,
		onToggleShowTiers,
		onAutoRecalculate,
		vipPrice,
		dmsPrice,
		promoPrice,
		nightPrice,
		onVipPriceChange,
		onDmsPriceChange,
		onPromoPriceChange,
		onNightPriceChange,
	} = props;

	return (
		<div className="pricelist-form-section" style={{ marginTop: "0.75rem" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<button
					type="button"
					className="pricelist-btn"
					style={{ height: "32px", fontSize: "0.75rem", gap: "0.375rem" }}
					onClick={onToggleShowTiers}
				>
					<span>
						{showTiers
							? "Скрыть тарифную сетку"
							: "Настроить тарифы (VIP, ДМС, Промо, Ночь)"}
					</span>
				</button>
				{showTiers && (
					<button
						type="button"
						className="pricelist-btn"
						style={{ height: "32px", fontSize: "0.75rem", gap: "0.375rem" }}
						onClick={onAutoRecalculate}
						title="Пересчитать автоматически от базовой цены"
					>
						<Sparkles size={12} />
						<span>Авторасчет</span>
					</button>
				)}
			</div>

			{showTiers && (
				<PricelistServiceFormTierGrid
					vipPrice={vipPrice}
					dmsPrice={dmsPrice}
					promoPrice={promoPrice}
					nightPrice={nightPrice}
					onVipPriceChange={onVipPriceChange}
					onDmsPriceChange={onDmsPriceChange}
					onPromoPriceChange={onPromoPriceChange}
					onNightPriceChange={onNightPriceChange}
				/>
			)}
		</div>
	);
};
