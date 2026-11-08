/**
 * PresenterStagesSection.tsx — Клинические этапы и зубная формула презентера (Мандат 8b, 8e).
 * Делегирует в единый SSOT TreatmentPlanStagesList.
 */

import React from "react";
import type { TreatmentPlanTier, TreatmentPlanStage } from "../treatmentPlanTypes";
import { TreatmentPlanStagesList } from "./TreatmentPlanStagesList";

export interface PresenterStagesSectionProps {
	readonly activeTier: TreatmentPlanTier | undefined;
	readonly expandedStageIndex: number | null;
	readonly onToggleStage: (idx: number) => void;
	readonly onPayStageClick: (stage: TreatmentPlanStage) => void;
	readonly onWorkOrderClick?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export const PresenterStagesSection: React.FC<PresenterStagesSectionProps> = ({
	activeTier,
	expandedStageIndex,
	onToggleStage,
	onPayStageClick,
	onWorkOrderClick,
}) => {
	return (
		<TreatmentPlanStagesList
			activeTier={activeTier}
			expandedStageIndex={expandedStageIndex}
			onToggleStage={onToggleStage}
			onPayStage={onPayStageClick}
			onWorkOrder={onWorkOrderClick}
		/>
	);
};

export default PresenterStagesSection;
