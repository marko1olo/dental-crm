import { useCallback, useState } from "react";
import { showToast } from "../../GlobalToast";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { executeClinicalPresetTaskAutonomy, saveLocalTask, updateLocalTaskStatus } from "../clinicalTasksPresets";
import { OPEN_STATUSES, type ClinicalPhaseCode, type ClinicalTask, type ClinicalTaskPreset, type ClinicalTaskStatus } from "../clinicalTasksTypes";
import { submitPhaseCompletion } from "./clinicalPhaseTransitionEngine";
import { useClinicalTasksFetch } from "./useClinicalTasksFetch";

export interface UseClinicalTasksStateParams {
	patientId: string | null | undefined;
	assignedDoctorId?: string | null | undefined;
	treatmentPlanId?: string | null | undefined;
}

export function useClinicalTasksState({ patientId, assignedDoctorId = null, treatmentPlanId = null }: UseClinicalTasksStateParams) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const readHeaders = useCallback(() => (auth ? auth.denteClinicalReadHeaders() : {}), [auth]);
	const { tasks, setTasks, customTaskTypes, error, loading, load } = useClinicalTasksFetch(patientId, readHeaders);

	const [submittingPhase, setSubmittingPhase] = useState<ClinicalPhaseCode | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [actionNotice, setActionNotice] = useState<string | null>(null);
	const [notes, setNotes] = useState("");
	const [filterStatus, setFilterStatus] = useState<"open" | "completed" | "all">("open");
	const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

	const completePhase = async (phaseCode: ClinicalPhaseCode) => {
		if (!patientId) { setActionError("Пациент не выбран — завершить этап нельзя."); return; }
		setActionError(null); setActionNotice(null); setSubmittingPhase(phaseCode);
		try {
			const mutationHeaders = auth ? auth.denteClinicalMutationHeaders() : {};
			const res = await submitPhaseCompletion({ patientId, phaseCode, notes, treatmentPlanId, assignedDoctorId, headers: mutationHeaders });
			if (!res.ok) { setActionError(res.errorMessage ?? "Сбой при передаче этапа"); return; }
			setActionNotice(`Этап зафиксирован: ${res.createdTitle}. Следующий врач увидит задачу в карте.`);
			setNotes("");
			await load();
		} finally { setSubmittingPhase(null); }
	};

	const createPresetTask = useCallback(async (preset: ClinicalTaskPreset) => {
		if (!patientId) { setActionError("Пациент не выбран — создать задачу нельзя."); return; }
		setActionError(null); setActionNotice(null);
		const { task: newTask, dueFormatted } = await executeClinicalPresetTaskAutonomy({
			preset, patientId, notes, organizationId: auth?.organizationId, treatmentPlanId, assignedDoctorId,
			authUserId: auth?.user?.id, setTasks: (updater) => setTasks(updater), showToastFn: showToast,
		});
		setActionNotice(`Создана клиническая задача: «${preset.title}» (срок: ${dueFormatted}).`);
		if (notes.trim()) setNotes("");
		try {
			const effective = assignedDoctorId || auth?.user?.id;
			if (effective) {
				void fetch(`/api/patients/${encodeURIComponent(patientId)}/tickets`, {
					method: "POST",
					headers: auth ? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" },
					body: JSON.stringify({ title: preset.title, description: newTask.description, assignedToId: effective, priority: "normal" }),
				}).catch((err) => logger.warn("[ClinicalTasks] Background ticket sync failed:", err));
			}
		} catch { /* сохранен локально */ }
	}, [patientId, notes, auth, treatmentPlanId, assignedDoctorId, setTasks]);

	const handleCompleteTask = useCallback(async (taskId: string) => {
		if (completingTaskId === taskId) return;
		setCompletingTaskId(taskId);
		setTasks((prev) => (prev ?? []).map((t) => (t.id === taskId ? { ...t, status: "completed" as ClinicalTaskStatus } : t)));
		try {
			const res = await fetch(`/api/clinical/tasks/${encodeURIComponent(taskId)}`, {
				method: "PATCH",
				headers: auth ? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "completed" }),
			});
			if (res.ok) {
				showToast("Клиническая задача завершена", "success");
				if (patientId) updateLocalTaskStatus(patientId, taskId, "completed");
			} else {
				showToast(actionFailureToast("Не удалось завершить задачу", res.status), "error");
				await load();
			}
		} catch (e) {
			logger.error("[ClinicalTasks complete]", e);
			showToast(actionFailureToast("Не удалось завершить задачу", null), "error");
			await load();
		} finally { setCompletingTaskId(null); }
	}, [completingTaskId, auth, patientId, load, setTasks]);

	const handleAddTask = useCallback(async (taskData: { title: string; description?: string | undefined; dueAt?: string | undefined; taskType?: string | undefined }) => {
		if (!patientId) return;
		const newTask: ClinicalTask = {
			id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `clinical-task-${Date.now()}`,
			organizationId: auth?.organizationId ?? "current-org", patientId, treatmentPlanId, assignedDoctorId,
			taskType: taskData.taskType ?? "custom_reminder", status: "pending", title: taskData.title,
			description: taskData.description ?? null, dueAt: taskData.dueAt ?? null, createdAt: new Date().toISOString(),
		};
		saveLocalTask(patientId, newTask);
		setTasks((prev) => [newTask, ...(prev ?? []).filter((t) => t.id !== newTask.id)]);
		showToast(`Задача создана: ${taskData.title}`, "success");
		try {
			await fetch(`/api/clinical/tasks`, {
				method: "POST",
				headers: auth ? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" },
				body: JSON.stringify(newTask),
			});
		} catch (e) { logger.warn("[ClinicalTasks] Sync task failed, kept locally", e); }
	}, [patientId, auth, treatmentPlanId, assignedDoctorId, setTasks]);

	const openTasks = (tasks ?? []).filter((t) => OPEN_STATUSES.has(t.status));
	const closedTasks = (tasks ?? []).filter((t) => !OPEN_STATUSES.has(t.status));
	const visibleTasks = (tasks ?? []).filter((t) => filterStatus === "open" ? OPEN_STATUSES.has(t.status) : filterStatus === "completed" ? !OPEN_STATUSES.has(t.status) : true);

	return {
		tasks, customTaskTypes, error, loading, submittingPhase, actionError, actionNotice, notes, setNotes,
		filterStatus, setFilterStatus, completingTaskId, load, completePhase, createPresetTask, handleCompleteTask,
		handleAddTask, openTasks, closedTasks, visibleTasks,
	};
}
