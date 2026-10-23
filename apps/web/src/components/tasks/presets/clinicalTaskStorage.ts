import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import type { ClinicalTask } from "../clinicalTasksTypes";

const LOCAL_STORAGE_KEY_PREFIX = "dente_clinical_local_tasks_";

export function getLocalTasks(patientId: string): ClinicalTask[] {
	try {
		const raw = safeLocalStorageGetItem(`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as ClinicalTask[]) : [];
	} catch {
		return [];
	}
}

export function saveLocalTask(patientId: string, task: ClinicalTask): void {
	try {
		const current = getLocalTasks(patientId);
		const updated = [task, ...current.filter((t) => t.id !== task.id)];
		safeLocalStorageSetItem(
			`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`,
			JSON.stringify(updated.slice(0, 50)),
		);
	} catch {
		// Ignore storage quota errors
	}
}

export function updateLocalTaskStatus(
	patientId: string,
	taskId: string,
	status: ClinicalTask["status"],
): void {
	try {
		const current = getLocalTasks(patientId);
		const updated = current.map((t) =>
			t.id === taskId ? { ...t, status } : t,
		);
		safeLocalStorageSetItem(
			`${LOCAL_STORAGE_KEY_PREFIX}${patientId}`,
			JSON.stringify(updated),
		);
	} catch {
		// Ignore storage quota errors
	}
}
