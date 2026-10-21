import React from "react";
import type { LabWorkflowStatus, OrthopedicWorkTypeId } from "../dentalLabWorkflowEngine";
import type { LabTechnologicalStageId } from "../orders/labWorkOrderPresets";
import { OrderFittingDatesAndCollision } from "./timelineCostModules/OrderFittingDatesAndCollision";
import { OrderStagesAndWorkflow } from "./timelineCostModules/OrderStagesAndWorkflow";
import { OrderFinancialSummaryBox } from "./timelineCostModules/OrderFinancialSummaryBox";

export interface LabOrderTimelineAndCostCardProps {
	readonly workType: OrthopedicWorkTypeId;
	readonly expectedLabDate: string;
	readonly onExpectedLabDateChange: (date: string) => void;
	readonly fittingDate: string;
	readonly onFittingDateChange: (date: string) => void;
	readonly hasCollision: boolean;
	readonly collisionWarningRu?: string | null | undefined;
	readonly autoBookFitting: boolean;
	readonly onAutoBookFittingChange: (val: boolean) => void;
	readonly techStage: LabTechnologicalStageId;
	readonly onTechStageChange: (stage: LabTechnologicalStageId) => void;
	readonly initialStatus: LabWorkflowStatus;
	readonly onInitialStatusChange: (status: LabWorkflowStatus) => void;
	readonly priceRub: number;
	readonly onPriceRubChange: (price: number) => void;
	readonly costRub: number;
	readonly onCostRubChange: (cost: number) => void;
	readonly toothCount: number;
}

export const LabOrderTimelineAndCostCard: React.FC<LabOrderTimelineAndCostCardProps> = ({
	workType, expectedLabDate, onExpectedLabDateChange, fittingDate, onFittingDateChange,
	hasCollision, collisionWarningRu, autoBookFitting, onAutoBookFittingChange,
	techStage, onTechStageChange, initialStatus, onInitialStatusChange,
	priceRub, onPriceRubChange, costRub, onCostRubChange, toothCount,
}) => {
	return (
		<div className="space-y-3.5">
			<OrderFittingDatesAndCollision
				workType={workType} expectedLabDate={expectedLabDate}
				onExpectedLabDateChange={onExpectedLabDateChange} fittingDate={fittingDate}
				onFittingDateChange={onFittingDateChange} hasCollision={hasCollision}
				collisionWarningRu={collisionWarningRu} autoBookFitting={autoBookFitting}
				onAutoBookFittingChange={onAutoBookFittingChange}
			/>

			<OrderStagesAndWorkflow
				techStage={techStage} onTechStageChange={onTechStageChange}
				initialStatus={initialStatus} onInitialStatusChange={onInitialStatusChange}
			/>

			<OrderFinancialSummaryBox
				toothCount={toothCount} priceRub={priceRub}
				onPriceRubChange={onPriceRubChange} costRub={costRub}
				onCostRubChange={onCostRubChange}
			/>
		</div>
	);
};
