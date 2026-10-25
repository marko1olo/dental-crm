import type React from "react";
import { Sparkles } from "lucide-react";
import { QUICK_REDEMPTION_PRESETS_RUB } from "../../loyaltyPresets";

export interface LoyaltyQuickRedeemButtonsProps {
	readonly maxAllowedRedemptionRub: number;
	readonly onOneClickRedeem: () => void;
	readonly onApplyQuickPoints: (pts: number) => void;
	readonly onApplyMaxPoints: () => void;
}

export const LoyaltyQuickRedeemButtons: React.FC<LoyaltyQuickRedeemButtonsProps> = ({
	maxAllowedRedemptionRub,
	onOneClickRedeem,
	onApplyQuickPoints,
	onApplyMaxPoints,
}) => {
	return (
		<div className="loyalty-quick-actions-row">
			<button
				type="button"
				className="loyalty-quick-btn one-click-btn"
				onClick={onOneClickRedeem}
				data-testid="loyalty-one-click-redeem-btn"
				title="Списать максимально разрешенные бонусы в чек"
				style={{
					background: "var(--teal)",
					color: "var(--on-teal, var(--paper))",
					fontWeight: 700,
					display: "inline-flex",
					alignItems: "center",
					gap: "0.375rem",
					cursor: "pointer",
				}}
			>
				<Sparkles size={14} />
				Списать бонусы в чек ({maxAllowedRedemptionRub} ₽)
			</button>
			{QUICK_REDEMPTION_PRESETS_RUB.map((preset) => (
				<button
					key={preset}
					type="button"
					className="loyalty-quick-btn"
					onClick={() => onApplyQuickPoints(preset)}
				>
					Списать {preset.toLocaleString("ru-RU")} ₽
				</button>
			))}
			<button
				type="button"
				className="loyalty-quick-btn max-btn"
				onClick={onApplyMaxPoints}
			>
				Списать максимум ({maxAllowedRedemptionRub} ₽)
			</button>
		</div>
	);
};
