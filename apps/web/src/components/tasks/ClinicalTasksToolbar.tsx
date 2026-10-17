import React from "react";
import { AlertTriangle, Calendar, Clock, Plus, X } from "lucide-react";
import type { TaskDeadlineFilter } from "./clinicalTasksTypes";

export interface ClinicalTasksToolbarProps {
	readonly deadlineFilter: TaskDeadlineFilter;
	readonly onSelectDeadlineFilter: (filter: TaskDeadlineFilter) => void;
	readonly counts: {
		readonly all: number;
		readonly today: number;
		readonly tomorrow: number;
		readonly overdue: number;
	};
	readonly isAddingTask: boolean;
	readonly onToggleAddingTask: () => void;
}

export const ClinicalTasksToolbar: React.FC<ClinicalTasksToolbarProps> = ({
	deadlineFilter,
	onSelectDeadlineFilter,
	counts,
	isAddingTask,
	onToggleAddingTask,
}) => {
	return (
		<div className="clinical-tasks-hub-header">
			{/* Чипы фильтрации по срокам выполнения задач */}
			<div
				className="deadline-filter-chips"
				role="group"
				aria-label="Фильтры по срокам задач"
			>
				<button
					type="button"
					className={`deadline-chip ${deadlineFilter === "all" ? "deadline-chip--active" : ""}`}
					data-testid="filter-deadline-all"
					onClick={() => onSelectDeadlineFilter("all")}
				>
					<span>Все</span>
					<span className="deadline-chip-count">{counts.all}</span>
				</button>

				<button
					type="button"
					className={`deadline-chip ${deadlineFilter === "today" ? "deadline-chip--active" : ""}`}
					data-testid="filter-deadline-today"
					onClick={() => onSelectDeadlineFilter("today")}
				>
					<Clock size={13} />
					<span>Сегодня</span>
					<span className="deadline-chip-count">{counts.today}</span>
				</button>

				<button
					type="button"
					className={`deadline-chip ${deadlineFilter === "tomorrow" ? "deadline-chip--active" : ""}`}
					data-testid="filter-deadline-tomorrow"
					onClick={() => onSelectDeadlineFilter("tomorrow")}
				>
					<Calendar size={13} />
					<span>Завтра</span>
					<span className="deadline-chip-count">{counts.tomorrow}</span>
				</button>

				<button
					type="button"
					className={`deadline-chip ${
						deadlineFilter === "overdue"
							? "deadline-chip--overdue-active"
							: counts.overdue > 0
								? "deadline-chip--overdue-has-items"
								: ""
					}`}
					data-testid="filter-deadline-overdue"
					onClick={() => onSelectDeadlineFilter("overdue")}
				>
					{counts.overdue > 0 ? <AlertTriangle size={13} /> : null}
					<span>Просрочено</span>
					<span className="deadline-chip-count">{counts.overdue}</span>
				</button>
			</div>

			{/* Кнопка быстрого добавления новой задачи */}
			<button
				type="button"
				className="primary-button tasks-add-btn"
				data-testid="btn-add-quick-task"
				onClick={onToggleAddingTask}
			>
				{isAddingTask ? <X size={14} /> : <Plus size={14} />}
				<span>{isAddingTask ? "Скрыть форму" : "Новая задача"}</span>
			</button>
		</div>
	);
};
