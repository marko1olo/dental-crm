/**
 * @file apps/web/src/helpers/workflowErrors.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

export function responseStatusFailureLabel(response: Response): string {
	if (response.status === 0) return "нет ответа сервера";
	if (response.status === 400) return "сервер не принял данные";
	if (response.status === 401 || response.status === 403)
		return "нет доступа к действию";
	if (response.status === 404) return "нужный маршрут не найден";
	if (response.status === 409) return "данные уже изменились, обновите экран";
	if (response.status === 413) return "файл или запрос слишком большой";
	if (response.status === 422) return "данные не прошли проверку";
	if (response.status === 429) return "слишком много запросов, повторите позже";
	if (response.status >= 500) return "сервер не смог выполнить действие";
	return `сервер вернул код ${response.status}`;
}

export async function responseErrorMessage(
	response: Response,
	fallback: string,
): Promise<string> {
	try {
		const payload = (await response.clone().json()) as {
			error?: unknown;
			message?: unknown;
		};
		const detail =
			typeof payload.message === "string"
				? payload.message
				: typeof payload.error === "string"
					? payload.error
					: null;
		const operatorDetail = operatorReadableErrorDetail(detail);
		return operatorDetail
			? `${fallback}: ${operatorDetail}`
			: `${fallback}: ${responseStatusFailureLabel(response)}`;
	} catch {
		return `${fallback}: ${responseStatusFailureLabel(response)}`;
	}
}

export class WorkflowResponseError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "WorkflowResponseError";
		this.status = status;
	}
}

export function acceptedVisitSaveFailureIsRetryable(error: unknown): boolean {
	if (!(error instanceof WorkflowResponseError)) return true;
	return (
		error.status === 0 ||
		error.status === 408 ||
		error.status === 429 ||
		error.status >= 500
	);
}

export function requestFailureMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}: сеть или локальный сервер недоступны. Повторите действие или проверьте подключение к серверу клиники.`;
}

export const technicalWorkflowFailurePattern =
	/\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|Load failed|fetch|JSON|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|stack|undefined|null|NaN|[A-Z][A-Z0-9_]{5,})\b|\/api\/|https?:\/\/|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;

export function operatorReadableErrorDetail(
	detail: string | null,
): string | null {
	const message = detail?.trim() ?? "";
	if (!message) return null;
	if (!/[А-Яа-яЁё]/.test(message)) return null;
	if (technicalWorkflowFailurePattern.test(message)) return null;
	return message;
}

export function operatorReadableErrorDetailFromUnknown(
	error: unknown,
): string | null {
	return operatorReadableErrorDetail(
		error instanceof Error ? error.message : null,
	);
}

export function operatorWorkflowFailureMessage(
	fallback: string,
	error: unknown,
): string {
	const message = operatorReadableErrorDetailFromUnknown(error);
	if (message) return message;
	return requestFailureMessage(fallback, error);
}

export function browserLocalSourceErrorMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}. Проверьте, что браузеру разрешено читать выбранный источник, или выберите файлы вручную.`;
}

export function browserCapabilityFailureMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}. Проверьте разрешения браузера и повторите действие; если устройство занято другой программой, закройте ее.`;
}
