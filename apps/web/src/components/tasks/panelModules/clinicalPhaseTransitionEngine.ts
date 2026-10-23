import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import type { ClinicalPhaseCode, ClinicalTask } from "../clinicalTasksTypes";

export function getLoadFailureMessage(status: number, serverMessage: string | null): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403)
		return "Нет прав смотреть клинические задачи: доступ закрыт или истёк вход в программу.";
	if (status === 404) return "Раздел клинических задач не отвечает.";
	if (status >= 500) return "Сбой на сервере клиники: список задач не собран.";
	return `Программа не смогла получить список задач (ответ ${status}).`;
}

export function getActionFailureMessage(status: number, serverMessage: string | null): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403)
		return "Нет прав завершать этап: доступ закрыт или истёк вход в программу.";
	if (status === 404)
		return "Пациент, план или врач не найдены в этой клинике — передачу не создали.";
	if (status === 400)
		return "Не удалось зафиксировать этап: проверьте, что пациент выбран и этап указан верно.";
	if (status >= 500)
		return "Сбой на сервере клиники: передачу между этапами не записали.";
	return `Программа не смогла зафиксировать этап (ответ ${status}).`;
}

export interface CompletePhaseParams {
	patientId: string;
	phaseCode: ClinicalPhaseCode;
	notes?: string;
	treatmentPlanId?: string | null;
	assignedDoctorId?: string | null;
	headers: Record<string, string>;
}

export async function submitPhaseCompletion(params: CompletePhaseParams): Promise<{
	ok: boolean;
	status: number;
	createdTitle?: string;
	errorMessage?: string;
}> {
	const body: Record<string, unknown> = {
		patientId: params.patientId,
		completedPhaseCode: params.phaseCode,
	};
	const trimmedNotes = (params.notes ?? "").trim();
	if (trimmedNotes !== "") body.notes = trimmedNotes;
	if (params.treatmentPlanId) body.treatmentPlanId = params.treatmentPlanId;
	if (params.assignedDoctorId) body.assignedDoctorId = params.assignedDoctorId;

	let response: Response;
	try {
		response = await fetch("/api/clinical/phase-completions", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...params.headers },
			body: JSON.stringify(body),
		});
	} catch {
		return {
			ok: false,
			status: 0,
			errorMessage: "Сервер клиники не ответил. Передачу не записали — повторите, когда сеть восстановится.",
		};
	}

	const payload = (await response.json().catch((err) => {
		logger.error("[Dente phase-completion]", err);
		return null;
	})) as (ClinicalTask & { message?: string }) | { message?: string } | null;

	if (!response.ok) {
		const message = payload && typeof payload === "object" && typeof payload.message === "string" ? payload.message : null;
		return { ok: false, status: response.status, errorMessage: getActionFailureMessage(response.status, message) };
	}

	const createdTitle = payload && typeof payload === "object" && "title" in payload && typeof payload.title === "string"
		? payload.title
		: "задача передачи";

	return { ok: true, status: response.status, createdTitle };
}
