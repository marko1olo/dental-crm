import type React from "react";
import { Award } from "lucide-react";
import type { LoyaltyTierDefinition, TierProgressionResult } from "../../loyaltyEngine";

export interface LoyaltyTierHeroCardProps {
	readonly patientName: string;
	readonly currentTier: LoyaltyTierDefinition;
	readonly effectiveBalanceRub: number;
	readonly tierProgression: TierProgressionResult;
}

export const LoyaltyTierHeroCard: React.FC<LoyaltyTierHeroCardProps> = ({
	patientName,
	currentTier,
	effectiveBalanceRub,
	tierProgression,
}) => {
	return (
		<div className="loyalty-tier-hero" style={{ background: currentTier.cardGradient }}>
			<div className="loyalty-tier-hero-bg-accent" />
			<div className="loyalty-tier-hero-top">
				<div>
					<span className="loyalty-tier-hero-badge">
						<Award size={16} />
						{currentTier.badgeLabelRu}
					</span>
					<h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem" }}>
						{patientName}
					</h3>
				</div>
				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>Кэшбэк бонусами</div>
					<div style={{ fontSize: "1.75rem", fontWeight: 800 }}>
						{currentTier.cashbackPercent}%
					</div>
				</div>
			</div>

			<div className="loyalty-points-display">
				<div className="loyalty-points-value">
					{effectiveBalanceRub.toLocaleString("ru-RU")}
					<span className="loyalty-points-label">бонусных ₽</span>
				</div>
				<p style={{ fontSize: "0.875rem", opacity: 0.95 }}>
					1 бонус = 1 рубль • Оплата до {currentTier.maxInvoiceCoveragePercent}% счета
				</p>
			</div>

			{tierProgression.nextTier && (
				<div className="loyalty-tier-progress-wrap">
					<div className="loyalty-progress-bar-track">
						<div
							className="loyalty-progress-bar-fill"
							style={{ width: `${tierProgression.progressPercent}%` }}
						/>
					</div>
					<div className="loyalty-progress-info">
						<span>
							Накоплено: {tierProgression.lifetimeSpentRub.toLocaleString("ru-RU")} ₽
						</span>
						<span>
							До уровня {tierProgression.nextTier.nameRu}:{" "}
							{tierProgression.remainingToNextTierRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>
			)}
		</div>
	);
};
