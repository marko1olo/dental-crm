import React from "react";
import type { ComprehensivePlanVariant, PlanTierCode } from "../planPresentationPresets";

export interface ComparatorSegmentedControlProps {
	variants: Record<PlanTierCode, ComprehensivePlanVariant>;
	selectedTier: PlanTierCode;
	onSelectTier: (tierKey: PlanTierCode) => void;
}

export const ComparatorSegmentedControl: React.FC<ComparatorSegmentedControlProps> = ({
	variants,
	selectedTier,
	onSelectTier,
}) => {
	const tiers: PlanTierCode[] = ["optimum_vip", "standard_recommended", "economy_basic"];

	return (
		<div
			className="plan-comparator-segmented-control"
			data-testid="comparator-segmented-control"
		>
			{tiers.map((tierKey) => {
				const v = variants[tierKey];
				const isSelected = selectedTier === tierKey;
				return (
					<button
						key={tierKey}
						type="button"
						className={`plan-segmented-tab ${isSelected ? "active" : ""}`}
						onClick={() => onSelectTier(tierKey)}
						data-testid={`comparator-tab-${tierKey}`}
					>
						<span className="plan-segmented-tab-title">{v.title.split("(")[0]?.trim()}</span>
						<span className="plan-segmented-tab-price">{v.totalCostRub.toLocaleString("ru-RU")} ₽</span>
					</button>
				);
			})}
		</div>
	);
};
