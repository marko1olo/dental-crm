import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { PatientPersonalCabinetData } from "../../patientCabinetEngine.js";
import { formatRubles } from "../../patientCabinetEngine.js";

interface TreatmentPlanTierSelectorProps {
	readonly threeTierModel: NonNullable<PatientPersonalCabinetData["threeTierModel"]>;
	readonly selectedTier: "basic" | "standard" | "premium";
	readonly onSelectTier: (tier: "basic" | "standard" | "premium") => void;
}

export const TreatmentPlanTierSelector: React.FC<TreatmentPlanTierSelectorProps> = ({
	threeTierModel,
	selectedTier,
	onSelectTier,
}) => {
	const getTier = (key: "basic" | "standard" | "premium"): any => {
		if (Array.isArray(threeTierModel.tiers)) {
			return threeTierModel.tiers.find((t: any) => t.tierId === key || t.id === key);
		}
		return (threeTierModel.tiers as any)?.[key];
	};

	const currentTierObj = getTier(selectedTier);
	const benefitsList: string[] = currentTierObj?.advantagesRu || currentTierObj?.benefits || [];
	const summaryText: string = currentTierObj?.summaryRu || currentTierObj?.subtitleRu || "";

	return (
		<div className="pc-card pc-tier-selector-card" data-testid="pc-3tier-selector">
			<div className="pc-tier-header">
				<span className="pc-tier-label">Сравнение тарифов лечения:</span>
				<span className="pc-tier-current-badge">
					Выбран тариф:{" "}
					<strong>
						{selectedTier === "basic" ? "Эконом" : selectedTier === "premium" ? "Премиум" : "Оптимум"}
					</strong>
				</span>
			</div>

			<div className="pc-tier-segmented-control" role="tablist">
				{(["basic", "standard", "premium"] as const).map((tierKey) => {
					const tierObj = getTier(tierKey);
					const isSelected = selectedTier === tierKey;
					const fallbackName = tierKey === "basic" ? "Эконом" : tierKey === "premium" ? "Премиум" : "Оптимум";
					const displayName = tierObj?.titleRu || tierObj?.nameRu || tierObj?.tierNameRu || fallbackName;
					const priceText = tierObj?.totalCostRub != null ? formatRubles(tierObj.totalCostRub) : "—";

					return (
						<button
							key={tierKey}
							type="button"
							role="tab"
							aria-selected={isSelected}
							className={`pc-tier-tab-btn ${isSelected ? "active" : ""}`}
							onClick={() => onSelectTier(tierKey)}
							data-testid={`btn-tier-${tierKey}`}
						>
							<span className="pc-tier-name">
								{tierKey === "standard" && (
									<Sparkles size={14} className="pc-icon-primary inline-block mr-1" />
								)}
								{displayName}
							</span>
							<span className="pc-tier-price">
								{priceText}
							</span>
						</button>
					);
				})}
			</div>

			{currentTierObj && (
				<div className="pc-tier-details-box">
					{summaryText && <p className="pc-tier-summary">{summaryText}</p>}
					{benefitsList.length > 0 && (
						<div className="pc-tier-features-list">
							{benefitsList.map((adv, i) => (
								<div key={i} className="pc-tier-feature-item">
									<CheckCircle2 size={15} className="pc-icon-success" />
									<span>{adv}</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
