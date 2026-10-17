/**
 * apps/web/src/components/tasks/ClinicalTasksStandaloneWorkspace.tsx
 * Standalone workspace for Clinical Tasks Hub & Shift Handoff (Route: ?tasks=true)
 */

import React, { useState } from "react";
import { ClinicalTasksTable } from "./ClinicalTasksTable";
import type { ClinicalTask } from "./clinicalTasksTypes";
import { getLocalTasks, saveLocalTask, updateLocalTaskStatus } from "./clinicalTasksPresets";

export const DEFAULT_STANDALONE_TASKS: ClinicalTask[] = [
	{
		id: "task-overdue-1",
		organizationId: "org-1",
		patientId: "pat-showcase-1",
		patientName: "Ковалев А.В.",
		treatmentPlanId: "plan-1",
		assignedDoctorId: "doc-1",
		taskType: "custom_reminder",
		status: "pending",
		title: "Забрать коронку из зуботехнической лаборатории",
		description: "Коронка из диоксида циркония на 26 зуб к плановой примерке в пятницу",
		dueAt: new Date(Date.now() - 2 * 86400000).toISOString(),
		createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
	},
	{
		id: "task-today-1",
		organizationId: "org-1",
		patientId: "pat-showcase-1",
		patientName: "Ковалев А.В.",
		treatmentPlanId: "plan-1",
		assignedDoctorId: "doc-1",
		taskType: "postop_call",
		status: "pending",
		title: "Контрольный звонок после сложного удаления 38 зуба",
		description: "Оценить общее самочувствие, гемостаз, отек и соблюдение рекомендаций",
		dueAt: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
		createdAt: new Date().toISOString(),
	},
	{
		id: "task-tomorrow-1",
		organizationId: "org-1",
		patientId: "pat-showcase-1",
		patientName: "Ковалев А.В.",
		treatmentPlanId: "plan-1",
		assignedDoctorId: "doc-1",
		taskType: "order_implant",
		status: "in_progress",
		title: "Заказ имплантата и остеопластического материала",
		description: "Имплантат 4.0x10 мм + гранулы Bio-Oss + мембрана Bio-Gide",
		dueAt: new Date(Date.now() + 86400000).toISOString(),
		createdAt: new Date().toISOString(),
	},
	{
		id: "task-completed-1",
		organizationId: "org-1",
		patientId: "pat-showcase-1",
		patientName: "Ковалев А.В.",
		treatmentPlanId: "plan-1",
		assignedDoctorId: "doc-1",
		taskType: "recall_hygiene",
		status: "completed",
		title: "Пригласить на плановую контрольную профгигиену",
		description: "Контрольный осмотр и гигиена полости рта через 6 месяцев",
		dueAt: new Date(Date.now() - 30 * 86400000).toISOString(),
		createdAt: new Date(Date.now() - 100 * 86400000).toISOString(),
	},
];

export const ClinicalTasksStandaloneWorkspace: React.FC = () => {
	const [tasks, setTasks] = useState<ClinicalTask[]>(() => {
		const saved = getLocalTasks("pat-showcase-1");
		return saved.length > 0 ? saved : DEFAULT_STANDALONE_TASKS;
	});
	const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

	const handleComplete = (taskId: string) => {
		setCompletingTaskId(taskId);
		updateLocalTaskStatus(taskId, "completed");
		setTasks((prev) =>
			prev.map((t) => (t.id === taskId ? { ...t, status: "completed" as const } : t)),
		);
		setTimeout(() => setCompletingTaskId(null), 300);
	};

	const handleAdd = (newTask: {
		title: string;
		description?: string | undefined;
		dueAt?: string | undefined;
		taskType?: string | undefined;
	}) => {
		const created: ClinicalTask = {
			id: `task-${Date.now()}`,
			organizationId: "org-1",
			patientId: "pat-showcase-1",
			patientName: "Ковалев А.В.",
			treatmentPlanId: "plan-1",
			assignedDoctorId: "doc-1",
			taskType: newTask.taskType || "custom_reminder",
			status: "pending",
			title: newTask.title,
			description: newTask.description || null,
			dueAt: newTask.dueAt || null,
			createdAt: new Date().toISOString(),
		};
		saveLocalTask(created);
		setTasks((prev) => [created, ...prev]);
	};

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
			data-testid="clinical-tasks-standalone-workspace"
		>
			<ClinicalTasksTable
				visibleTasks={tasks}
				completingTaskId={completingTaskId}
				onCompleteTask={handleComplete}
				onAddTask={handleAdd}
				patientId="pat-showcase-1"
				patientName="Ковалев А.В."
			/>
		</div>
	);
};

export default ClinicalTasksStandaloneWorkspace;
