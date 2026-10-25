import type React from "react";
import { Check } from "lucide-react";
import type { PromoCodePreset } from "../../loyaltyPresets";

export interface LoyaltyPromoCardProps {
	readonly promo: PromoCodePreset;
	readonly onApplyPromoDirectly: (code: string) => void;
}

export const LoyaltyPromoCard: React.FC<LoyaltyPromoCardProps> = ({
	promo,
	onApplyPromoDirectly,
}) => {
	return (
		<div className="loyalty-promo-card">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					marginBottom: "0.5rem",
				}}
			>
				<span className="loyalty-promo-code-chip">{promo.code}</span>
				<button
					type="button"
					onClick={() => onApplyPromoDirectly(promo.code)}
					style={{
						border: "none",
						background: "rgba(13, 148, 136, 0.12)",
						color: "var(--teal)",
						cursor: "pointer",
						fontSize: "0.75rem",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						gap: "0.25rem",
						padding: "0.25rem 0.625rem",
						borderRadius: "0.375rem",
						minHeight: "44px",
					}}
					title="Рассчитать и применить промокод к чеку"
				>
					<Check size={14} /> Применить к чеку
				</button>
			</div>
			<h5 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: "0.25rem 0" }}>
				{promo.titleRu}
			</h5>
			<p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
				{promo.descriptionRu}
			</p>
			<div
				style={{
					fontSize: "0.6875rem",
					color: "var(--teal)",
					marginTop: "0.5rem",
					fontWeight: 600,
				}}
			>
				{promo.validityLabelRu}
			</div>
		</div>
	);
};
