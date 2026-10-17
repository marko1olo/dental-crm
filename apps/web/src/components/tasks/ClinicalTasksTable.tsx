import React, { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
	type ClinicalTasksTableProps,
	type TaskDeadlineFilter,
} from "./clinicalTasksTypes";
import {
	countTasksByDeadline,
	filterTasksByDeadline,
} from "./clinicalTasksPresets";
import { ClinicalTasksToolbar } from "./ClinicalTasksToolbar";
import { ClinicalTaskCreateDrawer } from "./ClinicalTaskCreateDrawer";
import { ClinicalTasksDesktopTable } from "./ClinicalTasksDesktopTable";
import { ClinicalTasksMobileCards } from "./ClinicalTasksMobileCards";
import "./ClinicalTasksTable.css";

export const ClinicalTasksTable: React.FC<ClinicalTasksTableProps> = ({
	visibleTasks,
	completingTaskId,
	onCompleteTask,
	onAddTask,
	patientId,
	patientName,
	assignedDoctorId,
}) => {
	const [deadlineFilter, setDeadlineFilter] = useState<TaskDeadlineFilter>("all");
	const [isAddingTask, setIsAddingTask] = useState(false);

	// Подсчет счетчиков дедлайнов для чипов
	const counts = useMemo(
		() => countTasksByDeadline(visibleTasks),
		[visibleTasks],
	);

	// Фильтрация по дедлайну
	const filteredTasks = useMemo(
		() => filterTasksByDeadline(visibleTasks, deadlineFilter),
		[visibleTasks, deadlineFilter],
	);

	return (
		<div className="clinical-tasks-hub" data-testid="clinical-tasks-hub">
			{/* Верхняя панель управления: Фильтры по дедлайну + кнопка «+ Новая задача» */}
			<ClinicalTasksToolbar
				deadlineFilter={deadlineFilter}
				onSelectDeadlineFilter={setDeadlineFilter}
				counts={counts}
				isAddingTask={isAddingTask}
				onToggleAddingTask={() => setIsAddingTask((prev) => !prev)}
			/>

			{/* Компактная форма 1-клик добавления задачи */}
			{isAddingTask ? (
				<ClinicalTaskCreateDrawer
					patientId={patientId}
					patientName={patientName}
					onAddTask={onAddTask}
					onClose={() => setIsAddingTask(false)}
				/>
			) : null}

			{/* Пустое состояние в выбранном фильтре */}
			{filteredTasks.length === 0 ? (
				<div
					className="clinical-tasks-empty"
					data-testid="clinical-tasks-empty"
				>
					<CheckCircle2 size={28} className="clinical-tasks-empty-icon" />
					<p style={{ margin: 0, fontWeight: 500 }}>
						{deadlineFilter === "today"
							? "На сегодня открытых задач нет — все напоминания выполнены."
							: deadlineFilter === "tomorrow"
								? "На завтра запланированных задач нет."
								: deadlineFilter === "overdue"
									? "Просроченных задач нет — график лечения соблюдается."
									: "Клинических задач пока нет. Выберите пресет выше или добавьте задачу кнопкой."}
					</p>
				</div>
			) : null}

			{/* ДЕСКТОПНЫЙ ВИД: Таблица задач (>768px) */}
			{filteredTasks.length > 0 ? (
				<ClinicalTasksDesktopTable
					tasks={filteredTasks}
					completingTaskId={completingTaskId}
					onCompleteTask={onCompleteTask}
				/>
			) : null}

			{/* МОБИЛЬНЫЙ ВИД: Grouped List Cards (Apple HIG, <= 768px) */}
			{filteredTasks.length > 0 ? (
				<ClinicalTasksMobileCards
					tasks={filteredTasks}
					completingTaskId={completingTaskId}
					onCompleteTask={onCompleteTask}
				/>
			) : null}
		</div>
	);
};

export default ClinicalTasksTable;
