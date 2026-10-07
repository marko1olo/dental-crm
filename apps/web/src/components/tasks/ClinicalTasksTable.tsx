import React from "react";
import {
	OPEN_STATUSES,
	STATUS_LABELS,
	type ClinicalTask,
} from "./clinicalTasksTypes";
import { formatMoment } from "./clinicalTasksPresets";

export interface ClinicalTasksTableProps {
	readonly visibleTasks: readonly ClinicalTask[];
	readonly completingTaskId: string | null;
	readonly onCompleteTask: (taskId: string) => void;
}

export const ClinicalTasksTable: React.FC<ClinicalTasksTableProps> = ({
	visibleTasks,
	completingTaskId,
	onCompleteTask,
}) => {
	if (visibleTasks.length === 0) return null;

	return (
		<div className="ops-table-wrap">
			<table className="ops-table">
				<caption className="sr-only">Задачи передачи между этапами</caption>
				<thead>
					<tr>
						<th scope="col">Задача</th>
						<th scope="col">Статус</th>
						<th scope="col">Создана</th>
						<th scope="col" style={{ textAlign: "right" }}>
							Действие
						</th>
					</tr>
				</thead>
				<tbody>
					{visibleTasks.map((task) => {
						const isOpen = OPEN_STATUSES.has(task.status);
						return (
							<tr key={task.id}>
								<td
									className="ops-strong min-w-0"
									data-label="Задача"
									style={{ maxWidth: "320px" }}
								>
									<span
										className="truncate block"
										style={{ fontWeight: 600 }}
									>
										{task.title}
									</span>
									{task.description ? (
										<span
											className="ops-note break-words"
											style={{
												display: "block",
												fontSize: "0.8rem",
												color: "var(--muted)",
											}}
										>
											{task.description}
										</span>
									) : null}
								</td>
								<td data-label="Статус">
									<span
										className={`ops-state ${isOpen ? "ops-state--warn" : "ops-state--ok"}`}
									>
										{STATUS_LABELS[task.status] ?? task.status}
									</span>
								</td>
								<td data-label="Создана">
									{task.createdAt ? formatMoment(task.createdAt) : "—"}
									{task.dueAt ? (
										<span
											className="ops-note"
											style={{
												display: "block",
												marginTop: "0.2rem",
												fontSize: "0.8rem",
												color: "var(--brand-primary, #0284c7)",
											}}
										>
											Срок: {formatMoment(task.dueAt)}
										</span>
									) : null}
								</td>
								<td data-label="Действие" style={{ textAlign: "right" }}>
									{isOpen ? (
										<button
											type="button"
											className="primary-button"
											disabled={false}
											onClick={() => void onCompleteTask(task.id)}
											style={{
												height: "30px",
												fontSize: "0.75rem",
												padding: "0 0.6rem",
												borderRadius: "6px",
												cursor: "pointer",
												whiteSpace: "nowrap",
											}}
											title="Завершить задачу в 1 клик"
										>
											{completingTaskId === task.id
												? "Завершаю…"
												: "Завершить в 1 клик"}
										</button>
									) : (
										<span
											style={{
												fontSize: "0.8rem",
												color: "var(--muted)",
											}}
										>
											Выполнена
										</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
