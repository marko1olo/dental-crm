import React from "react";
import { Check } from "lucide-react";
import {
	OPEN_STATUSES,
	STATUS_LABELS,
	type ClinicalTask,
} from "../clinicalTasksTypes";
import { getDeadlineBadge } from "../clinicalTasksPresets";

export interface ClinicalTasksMobileCardItemProps {
	readonly task: ClinicalTask;
	readonly completingTaskId: string | null;
	readonly onCompleteTask: (taskId: string) => void;
}

export const ClinicalTasksMobileCardItem: React.FC<ClinicalTasksMobileCardItemProps> = ({
	task,
	completingTaskId,
	onCompleteTask,
}) => {
	const isOpen = OPEN_STATUSES.has(task.status);
	const badge = getDeadlineBadge(task.dueAt);
	const isCurrentCompleting = completingTaskId === task.id;

	return (
		<div
			className={`grouped-list-card mobile-task-card ${
				isOpen && badge.isOverdue ? "mobile-task-card--overdue" : ""
			}`}
			data-testid={`mobile-task-card-${task.id}`}
			style={{ minHeight: "56px" }}
		>
			<button
				type="button"
				className={`mobile-checkbox ${!isOpen ? "mobile-checkbox--completed" : ""}`}
				data-testid={`mobile-checkbox-${task.id}`}
				onClick={() => {
					if (isOpen) void onCompleteTask(task.id);
				}}
				aria-label={isOpen ? "Завершить задачу" : "Задача выполнена"}
				style={{ minWidth: "44px", minHeight: "44px" }}
			>
				{isOpen ? (
					<span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "transparent" }} />
				) : (
					<Check size={20} strokeWidth={3} />
				)}
			</button>

			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "0.35rem",
						marginBottom: "0.25rem",
					}}
				>
					<span
						className={!isOpen ? "task-title-text--completed" : "task-title-text"}
						style={{ fontSize: "0.95rem" }}
					>
						{task.title}
					</span>

					<span
						className={`task-deadline-badge task-deadline-badge--${badge.tone}`}
						style={{ fontSize: "0.72rem", fontWeight: 600 }}
					>
						{badge.label}
					</span>
				</div>

				{task.description ? (
					<p
						className="ops-note break-words"
						style={{ margin: "0 0 0.45rem 0", fontSize: "0.82rem", lineHeight: 1.35 }}
					>
						{task.description}
					</p>
				) : null}

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginTop: "0.35rem",
						paddingTop: "0.35rem",
						borderTop: "1px dashed var(--line)",
					}}
				>
					<span
						className={`ops-state ${isOpen ? "ops-state--warn" : "ops-state--ok"}`}
						style={{ fontSize: "0.75rem" }}
					>
						{STATUS_LABELS[task.status] ?? task.status}
					</span>

					{isOpen ? (
						<button
							type="button"
							className="primary-button mobile-complete-btn"
							data-testid={`mobile-btn-complete-${task.id}`}
							onClick={() => void onCompleteTask(task.id)}
							style={{ minHeight: "44px", minWidth: "44px" }}
						>
							<Check size={16} />
							<span>{isCurrentCompleting ? "Завершаю…" : "Выполнено"}</span>
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
};
