import { useCallback, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
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
	const orgId = appLogic?.dashboard?.clinicSettings?.profile?.organizationId || auth?.activeWorkspaceProfile?.id || "";
	const authUserId = auth?.activeWorkspaceProfile?.id || appLogic?.activeDoctor?.id;
	const { tasks, setTasks, customTaskTypes, error, loading, load } = useClinicalTasksFetch(patientId);

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
			const idempotencyKey = generateUuidV7();
			const mutationHeaders = auth
				? auth.denteClinicalMutationHeaders({ "Idempotency-Key": idempotencyKey })
				: { "Idempotency-Key": idempotencyKey };
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
			preset, patientId, notes, organizationId: orgId, treatmentPlanId, assignedDoctorId,
			authUserId: authUserId ?? null, setTasks: (updater) => setTasks(updater), showToastFn: showToast,
		});
		setActionNotice(`Создана клиническая задача: «${preset.title}» (срок: ${dueFormatted}).`);
		if (notes.trim()) setNotes("");
		const effective = assignedDoctorId || authUserId;
		if (effective) {
			try {
				const idempotencyKey = generateUuidV7();
				const headers = auth
					? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
					})
					: {
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
					};
				const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/tickets`, {
					method: "POST",
					headers,
					body: JSON.stringify({ title: preset.title, description: newTask.description, assignedToId: effective, priority: "normal" }),
				});
				if (!res.ok) {
					logger.warn("[ClinicalTasks] Ticket sync failed", { status: res.status });
					showToast(actionFailureToast("Задача сохранена локально, синхронизация не прошла", res.status), "warning");
				}
			} catch (err: unknown) {
				logger.warn("[ClinicalTasks] Background ticket sync failed:", err);
				showToast("Задача сохранена локально, сервер недоступен", "warning");
			}
		}
	}, [patientId, notes, auth, orgId, authUserId, treatmentPlanId, assignedDoctorId, setTasks]);

	const handleCompleteTask = useCallback(async (taskId: string) => {
		if (completingTaskId === taskId) return;
		setCompletingTaskId(taskId);
		setTasks((prev) => (prev ?? []).map((t) => (t.id === taskId ? { ...t, status: "completed" as ClinicalTaskStatus } : t)));
		try {
			const idempotencyKey = generateUuidV7();
			const headers = auth
				? auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				})
				: {
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				};
			const res = await fetch(`/api/clinical/tasks/${encodeURIComponent(taskId)}`, {
				method: "PATCH",
				headers,
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
		const optimisticId = generateUuidV7();
		const newTask: ClinicalTask = {
			id: optimisticId,
			organizationId: orgId,
			patientId,
			treatmentPlanId,
			assignedDoctorId,
			taskType: taskData.taskType ?? "custom_reminder",
			status: "pending",
			title: taskData.title,
			description: taskData.description ?? null,
			dueAt: taskData.dueAt ?? null,
			createdAt: new Date().toISOString(),
		};
		try {
			const idempotencyKey = generateUuidV7();
			const headers = auth
				? auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				})
				: {
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				};
			const res = await fetch(`/api/tasks`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					title: taskData.title,
					description: taskData.description ?? null,
					...(assignedDoctorId ? { assignedToId: assignedDoctorId } : {}),
					priority: "normal",
					taskType: taskData.taskType ?? "custom_reminder",
				}),
			});
			if (!res.ok) {
				const errText = await res.text().catch(() => "");
				logger.warn("[ClinicalTasks] POST /api/tasks failed", { status: res.status, errText });
				showToast(actionFailureToast("Не удалось создать задачу", res.status), "error");
				return;
			}
			let raw: unknown = null;
			try {
				raw = await res.json();
			} catch (jsonErr: unknown) {
				logger.warn("[ClinicalTasks] POST /api/tasks invalid JSON", jsonErr);
			}
			const created = (
				raw && typeof raw === "object" && "data" in raw
					? (raw as { data: Partial<ClinicalTask> }).data
					: raw
			) as Partial<ClinicalTask> | null;
			const savedTask: ClinicalTask = {
				...newTask,
				...(created?.id ? { id: created.id } : {}),
				...(created?.createdAt ? { createdAt: created.createdAt } : {}),
			};
			saveLocalTask(patientId, savedTask);
			setTasks((prev) => [savedTask, ...(prev ?? []).filter((t) => t.id !== savedTask.id)]);
			showToast(`Задача создана: ${taskData.title}`, "success");
		} catch (e) {
			logger.error("[ClinicalTasks] Create task network error", e);
			showToast(actionFailureToast("Не удалось создать задачу", null), "error");
		}
	}, [patientId, auth, orgId, treatmentPlanId, assignedDoctorId, setTasks]);

	const openTasks = (tasks ?? []).filter((t) => OPEN_STATUSES.has(t.status));
	const closedTasks = (tasks ?? []).filter((t) => !OPEN_STATUSES.has(t.status));
	const visibleTasks = (tasks ?? []).filter((t) => filterStatus === "open" ? OPEN_STATUSES.has(t.status) : filterStatus === "completed" ? !OPEN_STATUSES.has(t.status) : true);

	return {
		tasks, customTaskTypes, error, loading, submittingPhase, actionError, actionNotice, notes, setNotes,
		filterStatus, setFilterStatus, completingTaskId, load, completePhase, createPresetTask, handleCompleteTask,
		handleAddTask, openTasks, closedTasks, visibleTasks,
	};
}
