import type React from "react";
import { Sparkles } from "lucide-react";
import { REFERRAL_PROGRAM_PRESETS, type ReferralRewardPreset } from "../../loyaltyPresets";

export interface LoyaltyReferralPresetSelectorProps {
	readonly selectedReferralPreset: ReferralRewardPreset;
	readonly onSelectReferralPreset: (preset: ReferralRewardPreset) => void;
}

export const LoyaltyReferralPresetSelector: React.FC<LoyaltyReferralPresetSelectorProps> = ({
	selectedReferralPreset,
	onSelectReferralPreset,
}) => {
	return (
		<div
			style={{
				display: "flex",
				gap: "8px",
				flexWrap: "wrap",
				marginBottom: "1rem",
			}}
		>
			{REFERRAL_PROGRAM_PRESETS.map((preset) => {
				const isSelected = selectedReferralPreset.id === preset.id;
				return (
					<button
						key={preset.id}
						type="button"
						onClick={() => onSelectReferralPreset(preset)}
						style={{
							padding: "0.5rem 0.875rem",
							borderRadius: "0.5rem",
							border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
							background: isSelected ? "rgba(13, 148, 136, 0.1)" : "var(--paper)",
							color: isSelected ? "var(--teal)" : "var(--ink)",
							fontWeight: isSelected ? 700 : 500,
							fontSize: "0.8125rem",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "0.375rem",
						}}
					>
						<Sparkles size={13} color="var(--teal)" />
						<span>{preset.titleRu}</span>
					</button>
				);
			})}
		</div>
	);
};
