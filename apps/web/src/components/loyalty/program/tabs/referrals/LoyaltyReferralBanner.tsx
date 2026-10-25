import type React from "react";
import { Sparkles } from "lucide-react";
import type { ReferralRewardPreset } from "../../loyaltyPresets";

export interface LoyaltyReferralBannerProps {
	readonly selectedReferralPreset: ReferralRewardPreset;
	readonly referralCount: number;
	readonly totalRewardedRub: number;
}

export const LoyaltyReferralBanner: React.FC<LoyaltyReferralBannerProps> = ({
	selectedReferralPreset,
	referralCount,
	totalRewardedRub,
}) => {
	const minSpendRub = Math.round(
		((selectedReferralPreset.minFriendSpendKop ??
			selectedReferralPreset.minInvoiceSpendKop) ??
			250000) / 100,
	);

	return (
		<div className="loyalty-referral-banner">
			<div>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "0.375rem",
						background: "rgba(255, 255, 255, 0.2)",
						padding: "0.25rem 0.625rem",
						borderRadius: "9999px",
						fontSize: "0.75rem",
						fontWeight: 700,
						marginBottom: "0.5rem",
					}}
				>
					<Sparkles size={14} />
					Программа рекомендаций без корпоративных пирамид
				</div>
				<h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>
					{selectedReferralPreset.titleRu}
				</h3>
				<p style={{ fontSize: "0.8125rem", opacity: 0.95, margin: 0, lineHeight: 1.5 }}>
					{selectedReferralPreset.descriptionRu} (порог первого визита:{" "}
					{minSpendRub.toLocaleString("ru-RU")} ₽)
				</p>
			</div>
			<div style={{ textAlign: "right" }}>
				<div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>Зарегистрировано</div>
				<div style={{ fontSize: "2rem", fontWeight: 800 }}>{referralCount} чел.</div>
				<div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
					Начислено: {totalRewardedRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>
		</div>
	);
};
