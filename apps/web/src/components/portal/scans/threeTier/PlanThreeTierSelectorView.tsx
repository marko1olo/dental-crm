import React from "react";
import type { ThreeTierTreatmentPlanModel } from "../../patientCabinet/patientCabinetEngine.js";
import { PlanThreeTierButtons } from "./PlanThreeTierButtons";
import { PlanThreeTierMatrix } from "./PlanThreeTierMatrix";
import { PlanThreeTierBenefits } from "./PlanThreeTierBenefits";

export interface PlanThreeTierSelectorProps {
	readonly threeTierModel: ThreeTierTreatmentPlanModel;
	readonly selectedTierId: "basic" | "standard" | "premium";
	readonly onSelectTier: (tierId: "basic" | "standard" | "premium") => void;
}

export const PlanThreeTierSelector: React.FC<PlanThreeTierSelectorProps> = ({
	threeTierModel,
	selectedTierId,
	onSelectTier,
}) => {
	const curTier = threeTierModel.tiers.find((t) => t.tierId === selectedTierId);

	return (
		<div
			className="pc-card three-tier-selector-card"
			data-testid="three-tier-selector"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				borderRadius: "12px",
				border: "1px solid var(--pc-border, #334155)",
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			<div>
				<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
					3 Варианта плана реабилитации (Сравнение материалов и гарантии)
				</h4>
				<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
					Выберите подходящий уровень эстетики, биосовместимости и срока гарантийных обязательств:
				</p>
			</div>

			<PlanThreeTierButtons
				tiers={threeTierModel.tiers}
				selectedTierId={selectedTierId}
				onSelectTier={onSelectTier}
			/>

			<PlanThreeTierMatrix selectedTierId={selectedTierId} />

			<PlanThreeTierBenefits curTier={curTier} />
		</div>
	);
};

export const PatientPlanThreeTierSelector = PlanThreeTierSelector;
export default PlanThreeTierSelector;
