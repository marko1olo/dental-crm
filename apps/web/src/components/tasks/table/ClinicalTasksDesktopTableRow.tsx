import React from "react";
import { Check, CheckCircle2 } from "lucide-react";
import {
	OPEN_STATUSES,
	STATUS_LABELS,
	type ClinicalTask,
} from "../clinicalTasksTypes";
import { getDeadlineBadge } from "../clinicalTasksPresets";

export interface ClinicalTasksDesktopTableRowProps {
	readonly task: ClinicalTask;
	readonly completingTaskId: string | null;
	readonly onCompleteTask: (taskId: string) => void;
}

export const ClinicalTasksDesktopTableRow: React.FC<ClinicalTasksDesktopTableRowProps> = ({
	task,
	completingTaskId,
	onCompleteTask,
}) => {
	const isOpen = OPEN_STATUSES.has(task.status);
	const badge = getDeadlineBadge(task.dueAt);
	const isCurrentCompleting = completingTaskId === task.id;

	return (
		<tr
			data-testid={`task-row-${task.id}`}
			className={isOpen && badge.isOverdue ? "tasks-overdue-row" : undefined}
		>
			<td className="ops-strong min-w-0" data-label="Задача" style={{ maxWidth: "380px" }}>
				<div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
					<button
						type="button"
						className={`task-complete-toggle ${!isOpen ? "task-complete-toggle--completed" : ""}`}
						data-testid={`btn-complete-checkbox-${task.id}`}
						aria-label={isOpen ? "Отметить выполненной" : "Задача выполнена"}
						onClick={() => {
							if (isOpen) void onCompleteTask(task.id);
						}}
					>
						{!isOpen ? <Check size={14} strokeWidth={3} /> : null}
					</button>

					<div style={{ minWidth: 0, flex: 1 }}>
						<span className={`truncate block ${!isOpen ? "task-title-text--completed" : "task-title-text"}`}>
							{task.title}
						</span>
						{task.description ? (
							<span className="ops-note break-words block" style={{ marginTop: "0.2rem", fontSize: "0.78rem" }}>
								{task.description}
							</span>
						) : null}
					</div>
				</div>
			</td>

			<td data-label="Срок">
				<span className={`task-deadline-badge task-deadline-badge--${badge.tone}`}>
					{badge.label}
				</span>
			</td>

			<td data-label="Статус">
				<span className={`ops-state ${isOpen ? "ops-state--warn" : "ops-state--ok"}`} style={{ fontSize: "0.78rem" }}>
					{STATUS_LABELS[task.status] ?? task.status}
				</span>
			</td>

			<td data-label="Действие" style={{ textAlign: "right" }}>
				{isOpen ? (
					<button
						type="button"
						className="primary-button task-action-btn"
						data-testid={`btn-complete-task-${task.id}`}
						onClick={() => void onCompleteTask(task.id)}
						title="Завершить задачу в 1 клик"
					>
						<Check size={14} />
						<span>{isCurrentCompleting ? "Завершаю…" : "Выполнено"}</span>
					</button>
				) : (
					<span style={{ fontSize: "0.82rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
						<CheckCircle2 size={15} style={{ color: "var(--success, #10b981)" }} />
						<span>Выполнена</span>
					</span>
				)}
			</td>
		</tr>
	);
};
