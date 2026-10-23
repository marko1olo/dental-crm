import React from "react";
import { formatMoment } from "../clinicalTasksPresets";
import { STATUS_LABELS, type ClinicalTask } from "../clinicalTasksTypes";

export interface ClinicalTasksClosedAccordionProps {
	readonly closedTasks: readonly ClinicalTask[];
}

export const ClinicalTasksClosedAccordion: React.FC<ClinicalTasksClosedAccordionProps> = ({
	closedTasks,
}) => {
	if (closedTasks.length === 0) return null;

	return (
		<details className="clinical-rules-toggle" style={{ marginTop: "0.75rem" }}>
			<summary>Закрытые задачи ({closedTasks.length})</summary>
			<ul className="ops-note" style={{ marginTop: "0.5rem" }}>
				{closedTasks.map((task) => (
					<li key={task.id}>
						<strong>{task.title}</strong>
						{" · "}
						{STATUS_LABELS[task.status] ?? task.status}
						{task.createdAt ? ` · ${formatMoment(task.createdAt)}` : ""}
					</li>
				))}
			</ul>
		</details>
	);
};
