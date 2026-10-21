/**
 * TreatmentPlanStagesList.tsx — Высокопроизводительный список клинических этапов
 * плана лечения (Wave 19 / Chairside Low-Spec Tablet Optimized).
 */

import React from "react";
import type { TreatmentPlanTier, TreatmentPlanStage } from "./treatmentPlanPresenterTypes.js";
import { TreatmentPlanStagesListControls } from "./stagesList/TreatmentPlanStagesListControls.js";
import { TreatmentPlanStageCardItem } from "./stagesList/TreatmentPlanStageCardItem.js";

export interface TreatmentPlanStagesListProps {
	readonly tier: TreatmentPlanTier;
	readonly expandedStages: Record<number, boolean>;
	readonly onToggleStage: (stageNum: number) => void;
	readonly onToggleAllStages?: (expand: boolean) => void;
	readonly showMicroConsumables: boolean;
	readonly onUpdateItemPrice?: (itemId: string, newPriceRub: number) => void;
	readonly isCompact?: boolean;
}

export const TreatmentPlanStagesList: React.FC<TreatmentPlanStagesListProps> = ({
	tier,
	expandedStages,
	onToggleStage,
	onToggleAllStages,
	showMicroConsumables,
	isCompact = false,
}) => {
	const allExpanded = tier.stages.every((s) => expandedStages[s.stageNumber]);

	return (
		<div
			className="treatment-stages-list-container flex flex-col gap-3.5"
			data-testid="treatment-plan-stages-list"
			style={{ transform: "translateZ(0)", willChange: "transform" }}
		>
			{onToggleAllStages && tier.stages.length > 1 && (
				<TreatmentPlanStagesListControls
					totalStages={tier.stages.length}
					durationVisits={tier.durationVisits}
					allExpanded={allExpanded}
					onToggleAllStages={onToggleAllStages}
				/>
			)}

			{tier.stages.map((stage: TreatmentPlanStage) => (
				<TreatmentPlanStageCardItem
					key={stage.stageNumber}
					stage={stage}
					isExpanded={expandedStages[stage.stageNumber] ?? false}
					onToggleStage={onToggleStage}
					showMicroConsumables={showMicroConsumables}
				/>
			))}
		</div>
	);
};
