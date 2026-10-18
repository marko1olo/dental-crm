import React from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../../types";
import { PresenterTierCard } from "./PresenterTierCard";

export interface PresenterTiersGridProps {
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly onConfirmPatientChoice: (tier?: TreatmentPlanTier) => void;
	readonly setActiveTab?: ((tab: "comparison" | "stages" | "finance" | "print" | "aiAudit") => void) | undefined;
}

export const PresenterTiersGrid: React.FC<PresenterTiersGridProps> = ({
	allTiers,
	selectedTierId,
	getTierLetter,
	onSelectTier,
	onConfirmPatientChoice,
	setActiveTab,
}) => {
	const hasCustomRecommended = allTiers.some((t) => t.isRecommended);

	return (
		<div className="treatment-3tier-grid">
			{allTiers.map((tier) => {
				const isSelected = selectedTierId === tier.tierId;
				const isRecommended = hasCustomRecommended
					? Boolean(tier.isRecommended)
					: tier.tierId === "standard";
				const variantLetter = getTierLetter(tier.tierId);

				return (
					<PresenterTierCard
						key={tier.tierId}
						tier={tier}
						isSelected={isSelected}
						isRecommended={isRecommended}
						variantLetter={variantLetter}
						onSelectTier={onSelectTier}
						onConfirmPatientChoice={onConfirmPatientChoice}
						setActiveTab={setActiveTab}
					/>
				);
			})}
		</div>
	);
};
