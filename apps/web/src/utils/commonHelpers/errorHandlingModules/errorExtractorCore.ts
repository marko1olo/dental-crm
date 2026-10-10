import {
	getClinicalErrorTranslation,
	translateHttpStatus,
} from "./clinicalErrorTranslations.js";
import { isNetworkError } from "./errorClassificationPredicates.js";
import { WorkflowResponseError } from "./types.js";

export { WorkflowResponseError };

/**
 * Регулярное выражение для отсечения технических деталей и путей файлов в сообщениях для врача.
 */
export const technicalWorkflowFailurePattern =
	/\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|Load failed|fetch|JSON|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|stack|undefined|null|NaN|[A-Z][A-Z0-9_]{5,})\b|\/api\/|https?:\/\/|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;

/**
 * Формирует человекочитаемое сообщение о сетевом сбое.
 */
export function requestFailureMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}: сеть или локальный сервер недоступны. Повторите действие или проверьте подключение к серверу клиники.`;
}

/**
 * Извлекает русскоязычное клиническое пояснение из текста ошибки, если в нем нет тех. мусора.
 */
export function operatorReadableErrorDetail(
	detail: string | null,
): string | null {
	const message = detail?.trim() ?? "";
	if (!message) return null;
	if (!/[А-Яа-яЁё]/.test(message)) return null;
	if (technicalWorkflowFailurePattern.test(message)) return null;
	return message;
}

/**
 * Извлекает русскоязычное клиническое пояснение из произвольного значения ошибки.
 */
export function operatorReadableErrorDetailFromUnknown(
	error: unknown,
): string | null {
	return operatorReadableErrorDetail(
		error instanceof Error ? error.message : null,
	);
}

/**
 * Формирует сообщение об ошибке для оператора/врача с приоритетом клинического пояснения.
 */
export function operatorWorkflowFailureMessage(
	fallback: string,
	error: unknown,
): string {
	const message = operatorReadableErrorDetailFromUnknown(error);
	if (message) return message;
	return requestFailureMessage(fallback, error);
}

/**
 * Сообщение об ошибке доступа к локальному источнику в браузере.
 */
export function browserLocalSourceErrorMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}. Проверьте, что браузеру разрешено читать выбранный источник, или выберите файлы вручную.`;
}

/**
 * Сообщение об ошибке аппаратных возможностей браузера.
 */
export function browserCapabilityFailureMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}. Проверьте разрешения браузера и повторите действие; если устройство занято другой программой, закройте ее.`;
}

/**
 * Человекочитаемая текстовая метка статуса HTTP-ответа.
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

/**
 * Асинхронно извлекает сообщение об ошибке из объекта Response.
 */
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

/**
 * Базовая функция извлечения текста ошибки из произвольного источника (Axios, Fetch, Error, string).
 */
export function extractErrorMessage(
	error: unknown,
	fallback = "Произошла непредвиденная ошибка",
): string {
	if (!error) return fallback;

	if (typeof error === "string") {
		const cleaned = error.trim();
		return cleaned ? (operatorReadableErrorDetail(cleaned) ?? cleaned) : fallback;
	}

	if (error instanceof WorkflowResponseError) {
		const detail = operatorReadableErrorDetail(error.message);
		if (detail) return detail;
		return `${fallback}: ${translateHttpStatus(error.status)}`;
	}

	if (isNetworkError(error)) {
		return requestFailureMessage(fallback, error);
	}

	if (error instanceof Error) {
		const readable = operatorReadableErrorDetail(error.message);
		if (readable) return readable;
	}

	if (typeof error === "object") {
		const obj = error as Record<string, unknown>;

		// Обработка Zod issues / Fastify валидации
		if (Array.isArray(obj.issues) && obj.issues.length > 0) {
			const issueMessages = obj.issues
				.map((issue: unknown) => {
					if (typeof issue === "object" && issue && "message" in issue) {
						return String((issue as { message: unknown }).message);
					}
					return null;
				})
				.filter(Boolean);
			if (issueMessages.length > 0) {
				return issueMessages.join("; ");
			}
		}

		// Поле message или error
		if (typeof obj.message === "string" && obj.message.trim()) {
			const readable = operatorReadableErrorDetail(obj.message);
			if (readable) return readable;
		}

		if (typeof obj.error === "string" && obj.error.trim()) {
			const readable = operatorReadableErrorDetail(obj.error);
			if (readable) return readable;
		}

		// Fastify / Postgres code
		if (typeof obj.code === "string") {
			const translated = getClinicalErrorTranslation(obj.code);
			if (translated) return translated;
		}

		// HTTP status / statusCode
		const status = typeof obj.status === "number" ? obj.status : typeof obj.statusCode === "number" ? obj.statusCode : null;
		if (status !== null) {
			return `${fallback}: ${translateHttpStatus(status)}`;
		}
	}

	return fallback;
}

/**
 * Форматирует ошибку API с сохранением контекста для логирования и отображения.
 */
export function formatApiError(error: unknown): string {
	return extractErrorMessage(error, "Ошибка выполнения API-запроса");
}

/**
 * Возвращает дружественный для врача текст ошибки.
 */
export function getUserFriendlyErrorText(
	error: unknown,
	fallback = "Ошибка выполнения операции",
): string {
	return operatorWorkflowFailureMessage(fallback, error);
}
