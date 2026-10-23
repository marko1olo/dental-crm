import React from "react";
import type { ClinicalTask } from "./clinicalTasksTypes";
import { ClinicalTasksDesktopTableRow } from "./table/ClinicalTasksDesktopTableRow";

export interface ClinicalTasksDesktopTableProps {
	readonly tasks: readonly ClinicalTask[];
	readonly completingTaskId: string | null;
	readonly onCompleteTask: (taskId: string) => void;
}

export const ClinicalTasksDesktopTable: React.FC<ClinicalTasksDesktopTableProps> = ({
	tasks,
	completingTaskId,
	onCompleteTask,
}) => {
	return (
		<div className="clinical-tasks-desktop-table ops-table-wrap">
			<table className="ops-table">
				<caption className="sr-only">Список клинических задач и поручений</caption>
				<thead>
					<tr>
						<th scope="col" style={{ width: "42%" }}>
							Задача
						</th>
						<th scope="col" style={{ width: "18%" }}>
							Срок
						</th>
						<th scope="col" style={{ width: "16%" }}>
							Статус
						</th>
						<th scope="col" style={{ width: "24%", textAlign: "right" }}>
							Действие
						</th>
					</tr>
				</thead>
				<tbody>
					{tasks.map((task) => (
						<ClinicalTasksDesktopTableRow
							key={task.id}
							task={task}
							completingTaskId={completingTaskId}
							onCompleteTask={onCompleteTask}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
};
