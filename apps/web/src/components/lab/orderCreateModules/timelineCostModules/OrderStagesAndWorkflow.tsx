import React from "react";
import {
	type LabWorkflowStatus,
	LAB_WORKFLOW_STATUSES,
	LAB_WORKFLOW_STATUS_ORDER,
} from "../../dentalLabWorkflowEngine";
import {
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	type LabTechnologicalStageId,
} from "../../orders/labWorkOrderPresets";

export interface OrderStagesAndWorkflowProps {
	techStage: LabTechnologicalStageId;
	onTechStageChange: (stage: LabTechnologicalStageId) => void;
	initialStatus: LabWorkflowStatus;
	onInitialStatusChange: (status: LabWorkflowStatus) => void;
}

export function OrderStagesAndWorkflow({
	techStage, onTechStageChange, initialStatus, onInitialStatusChange,
}: OrderStagesAndWorkflowProps): React.JSX.Element {
	return (
		<div className="ztl-form-grid-2">
			<div className="ztl-form-group">
				<label className="ztl-form-label" htmlFor="select-tech-stage">
					Первичный клинический этап заказа
				</label>
				<select
					id="select-tech-stage"
					className="ztl-select w-full"
					value={techStage}
					onChange={(e) => onTechStageChange(e.target.value as LabTechnologicalStageId)}
					data-testid="select-tech-stage"
				>
					{LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
						const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
						return (
							<option key={stageKey} value={stageKey}>
								Этап {sDef.stepNumber}: {sDef.nameRu} ({sDef.departmentRu})
							</option>
						);
					})}
				</select>
			</div>

			<div className="ztl-form-group">
				<label className="ztl-form-label" htmlFor="select-initial-status">
					Начальный статус заказа
				</label>
				<select
					id="select-initial-status"
					className="ztl-select w-full"
					value={initialStatus}
					onChange={(e) => onInitialStatusChange(e.target.value as LabWorkflowStatus)}
					data-testid="select-initial-status"
				>
					{LAB_WORKFLOW_STATUS_ORDER.map((st) => (
						<option key={st} value={st}>
							{LAB_WORKFLOW_STATUSES[st].nameRu}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
