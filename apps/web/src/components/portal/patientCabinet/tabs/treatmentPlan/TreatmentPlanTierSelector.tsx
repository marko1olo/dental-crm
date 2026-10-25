import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { PatientPersonalCabinetData, TreatmentPlanTier } from "../../patientCabinetEngine.js";
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
	const currentTierObj = threeTierModel.tiers[selectedTier];

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
					const tierObj: TreatmentPlanTier | undefined = threeTierModel.tiers[tierKey];
					const isSelected = selectedTier === tierKey;
					const fallbackName = tierKey === "basic" ? "Эконом" : tierKey === "premium" ? "Премиум" : "Оптимум";
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
								{tierObj?.titleRu || tierObj?.nameRu || tierObj?.tierNameRu || fallbackName}
							</span>
							<span className="pc-tier-price">
								{tierObj ? formatRubles(tierObj.totalCostRub) : "—"}
							</span>
						</button>
					);
				})}
			</div>

			{currentTierObj && (
				<div className="pc-tier-details-box">
					<p className="pc-tier-summary">{currentTierObj.summaryRu}</p>
					<div className="pc-tier-features-list">
						{currentTierObj.advantagesRu.map((adv, i) => (
							<div key={i} className="pc-tier-feature-item">
								<CheckCircle2 size={15} className="pc-icon-success" />
								<span>{adv}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
