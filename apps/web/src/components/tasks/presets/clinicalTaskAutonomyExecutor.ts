import type { ClinicalTask, ClinicalTaskPreset } from "../clinicalTasksTypes";
import { formatMoment } from "./clinicalTaskDeadlines";
import { saveLocalTask } from "./clinicalTaskStorage";

export async function executeClinicalPresetTaskAutonomy(params: {
	preset: ClinicalTaskPreset;
	patientId: string;
	notes?: string;
	organizationId?: string;
	treatmentPlanId?: string | null;
	assignedDoctorId?: string | null;
	authUserId?: string | null;
	saveLocally?: boolean;
	setTasks?: (updater: (prev: ClinicalTask[] | null) => ClinicalTask[]) => void;
	showToastFn?: (
		msg: string,
		type: "info" | "success" | "warning" | "error",
	) => void;
}): Promise<{ task: ClinicalTask; dueFormatted: string }> {
	const dueAt = params.preset.computeDueAt();
	const trimmedNotes = (params.notes ?? "").trim();
	const finalDescription = trimmedNotes
		? `${params.preset.defaultDescription} Комментарий врача: ${trimmedNotes}`
		: params.preset.defaultDescription;

	const newTask: ClinicalTask = {
		id:
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `clinical-task-${Date.now()}-${(Date.now() % 100000).toString(36)}`,
		organizationId: params.organizationId ?? "current-org",
		patientId: params.patientId,
		treatmentPlanId: params.treatmentPlanId ?? null,
		assignedDoctorId: params.assignedDoctorId ?? null,
		taskType: params.preset.taskType,
		status: "pending",
		title: params.preset.title,
		description: finalDescription,
		dueAt,
		createdAt: new Date().toISOString(),
	};

	if (params.saveLocally !== false) {
		saveLocalTask(params.patientId, newTask);
	}

	if (params.setTasks) {
		params.setTasks((prev) => [
			newTask,
			...(prev ?? []).filter((t) => t.id !== newTask.id),
		]);
	}

	const formattedDue = formatMoment(dueAt);
	if (params.showToastFn) {
		params.showToastFn(
			`Клиническая задача создана: ${params.preset.title} (срок: ${formattedDue})`,
			"success",
		);
	}

	return { task: newTask, dueFormatted: formattedDue };
}
