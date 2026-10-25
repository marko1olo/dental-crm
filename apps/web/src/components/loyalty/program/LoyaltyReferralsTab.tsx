import type React from "react";
import { UserPlus, Users } from "lucide-react";
import type { PatientReferralRecord } from "./loyaltyEngine";
import type { ReferralRewardPreset } from "./loyaltyPresets";
import { LoyaltyReferralPresetSelector } from "./tabs/referrals/LoyaltyReferralPresetSelector";
import { LoyaltyReferralBanner } from "./tabs/referrals/LoyaltyReferralBanner";
import { LoyaltyReferralForm } from "./tabs/referrals/LoyaltyReferralForm";
import { LoyaltyReferralCard } from "./tabs/referrals/LoyaltyReferralCard";

export interface LoyaltyReferralsTabProps {
	readonly referrals: readonly PatientReferralRecord[];
	readonly selectedReferralPreset: ReferralRewardPreset;
	readonly onSelectReferralPreset: (preset: ReferralRewardPreset) => void;
	readonly newReferralName: string;
	readonly onNewReferralNameChange: (name: string) => void;
	readonly newReferralPhone: string;
	readonly onNewReferralPhoneChange: (phone: string) => void;
	readonly newReferralNote: string;
	readonly onNewReferralNoteChange: (note: string) => void;
	readonly onAddReferral: () => void;
	readonly onCreditReferral: (referralId: string) => void;
}

export const LoyaltyReferralsTab: React.FC<LoyaltyReferralsTabProps> = (p) => {
	const totalRewardedCount = p.referrals.filter((r) => r.isRewardCredited).length;
	const totalRewardedRub = totalRewardedCount * p.selectedReferralPreset.referrerRewardRub;

	return (
		<div>
			<LoyaltyReferralPresetSelector
				selectedReferralPreset={p.selectedReferralPreset}
				onSelectReferralPreset={p.onSelectReferralPreset}
			/>

			<LoyaltyReferralBanner
				selectedReferralPreset={p.selectedReferralPreset}
				referralCount={p.referrals.length}
				totalRewardedRub={totalRewardedRub}
			/>

			<h4 className="loyalty-section-title">
				<UserPlus size={20} color="var(--teal)" />
				Регистрация новой рекомендации
			</h4>

			<LoyaltyReferralForm
				newReferralName={p.newReferralName}
				onNewReferralNameChange={p.onNewReferralNameChange}
				newReferralPhone={p.newReferralPhone}
				onNewReferralPhoneChange={p.onNewReferralPhoneChange}
				newReferralNote={p.newReferralNote}
				onNewReferralNoteChange={p.onNewReferralNoteChange}
				onAddReferral={p.onAddReferral}
			/>

			<h4 className="loyalty-section-title">
				<Users size={20} color="var(--teal)" />
				Список рекомендаций пациента ({p.referrals.length})
			</h4>

			{p.referrals.length === 0 ? (
				<div
					style={{
						border: "2px dashed var(--line)",
						borderRadius: "0.875rem",
						padding: "2rem",
						textAlign: "center",
						color: "var(--muted)",
						background: "var(--paper-soft)",
					}}
				>
					<Users size={36} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
					<div style={{ fontWeight: 600, color: "var(--ink)" }}>
						Рекомендации пока не зарегистрированы
					</div>
					<p style={{ fontSize: "0.8125rem", marginTop: "4px" }}>
						Зарегистрируйте первого приглашенного пациента через форму выше. При первом визите и
						чеке от 2 500 ₽ вы сможете начислить рекомендателю 500 ₽ бонусов в 1 клик.
					</p>
				</div>
			) : (
				<div className="loyalty-referral-grid">
					{p.referrals.map((ref) => (
						<LoyaltyReferralCard
							key={ref.id}
							referral={ref}
							onCreditReferral={p.onCreditReferral}
						/>
					))}
				</div>
			)}
		</div>
	);
};
