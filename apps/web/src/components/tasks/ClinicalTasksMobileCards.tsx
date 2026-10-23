import React from "react";
import type { ClinicalTask } from "./clinicalTasksTypes";
import { ClinicalTasksMobileCardItem } from "./cards/ClinicalTasksMobileCardItem";

export interface ClinicalTasksMobileCardsProps {
	readonly tasks: readonly ClinicalTask[];
	readonly completingTaskId: string | null;
	readonly onCompleteTask: (taskId: string) => void;
}

export const ClinicalTasksMobileCards: React.FC<ClinicalTasksMobileCardsProps> = ({
	tasks,
	completingTaskId,
	onCompleteTask,
}) => {
	return (
		<div
			className="clinical-tasks-mobile-cards"
			data-testid="clinical-tasks-mobile-cards"
		>
			{tasks.map((task) => (
				<ClinicalTasksMobileCardItem
					key={`mobile-${task.id}`}
					task={task}
					completingTaskId={completingTaskId}
					onCompleteTask={onCompleteTask}
				/>
			))}
		</div>
	);
};
