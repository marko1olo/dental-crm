import { WorkflowResponseError } from "./types.js";

/**
 * Проверка принадлежности строкового ключа объекту Record.
 */
export function isRecordKey<T extends string>(
	value: unknown,
	record: Record<T, unknown>,
): value is T {
	return typeof value === "string" && Object.hasOwn(record, value);
}

/**
 * Проверка принадлежности значения массиву опций с полем value.
 */
export function isOptionValue<T extends string>(
	value: unknown,
	options: readonly { value: T }[],
): value is T {
	return (
		typeof value === "string" &&
		options.some((option) => option.value === value)
	);
}

/**
 * Проверка принадлежности значения списку разрешенных строк union.
 */
export function isStringUnionValue<T extends string>(
	value: unknown,
	allowedValues: readonly T[],
): value is T {
	return (
		typeof value === "string" &&
		allowedValues.some((allowedValue) => allowedValue === value)
	);
}

/**
 * Проверка булевой настройки интерфейса.
 */
export function isBooleanPreference(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Проверка ограниченной строки настройки (до 500 символов).
 */
export function isBoundedPreferenceString(value: unknown): value is string {
	return typeof value === "string" && value.length <= 500;
}

/**
 * Проверка на string | null.
 */
export function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === "string";
}

/**
 * Предикат: является ли ошибка сетевым сбоем или недоступностью сервера клиники.
 */
export function isNetworkError(error: unknown): boolean {
	if (!error) return false;
	if (error instanceof WorkflowResponseError && error.status === 0) return true;
	if (
		typeof error === "object" &&
		"status" in error &&
		(error as { status: unknown }).status === 0
	) {
		return true;
	}
	if (
		typeof error === "object" &&
		"statusCode" in error &&
		(error as { statusCode: unknown }).statusCode === 0
	) {
		return true;
	}
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	return /failed to fetch|networkerror|load failed|econnrefused|econnreset|etimedout|offline|сеть.*недоступна/i.test(
		message,
	);
}

/**
 * Предикат: является ли ошибка ошибкой авторизации или доступа (401 / 403).
 */
export function isAuthError(error: unknown): boolean {
	if (!error) return false;
	if (
		error instanceof WorkflowResponseError &&
		(error.status === 401 || error.status === 403)
	) {
		return true;
	}
	if (typeof error === "object" && "status" in error) {
		const s = (error as { status: unknown }).status;
		if (s === 401 || s === 403) return true;
	}
	if (typeof error === "object" && "statusCode" in error) {
		const s = (error as { statusCode: unknown }).statusCode;
		if (s === 401 || s === 403) return true;
	}
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	return /unauthorized|forbidden|jwt expired|token invalid|нет доступа|сессия истекла/i.test(
		message,
	);
}

/**
 * Предикат: является ли ошибка конфликтом данных или версий (409 или Postgres 23505).
 */
export function isConflictError(error: unknown): boolean {
	if (!error) return false;
	if (error instanceof WorkflowResponseError && error.status === 409) return true;
	if (
		typeof error === "object" &&
		"status" in error &&
		(error as { status: unknown }).status === 409
	) {
		return true;
	}
	if (
		typeof error === "object" &&
		"statusCode" in error &&
		(error as { statusCode: unknown }).statusCode === 409
	) {
		return true;
	}
	if (
		typeof error === "object" &&
		"code" in error &&
		(error as { code: unknown }).code === "23505"
	) {
		return true;
	}
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	return /conflict|already exists|уже существует|данные уже изменились/i.test(
		message,
	);
}

/**
 * Предикат: является ли ошибка ошибкой валидации входных данных (400, 422, Zod, Fastify).
 */
export function isValidationError(error: unknown): boolean {
	if (!error) return false;
	if (
		error instanceof WorkflowResponseError &&
		(error.status === 400 || error.status === 422)
	) {
		return true;
	}
	if (typeof error === "object" && "status" in error) {
		const s = (error as { status: unknown }).status;
		if (s === 400 || s === 422) return true;
	}
	if (typeof error === "object" && "statusCode" in error) {
		const s = (error as { statusCode: unknown }).statusCode;
		if (s === 400 || s === 422) return true;
	}
	if (
		typeof error === "object" &&
		"code" in error &&
		(error as { code: unknown }).code === "FST_ERR_VALIDATION"
	) {
		return true;
	}
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	return /validation|zoderror|не прошли проверку|ошибка проверки/i.test(
		message,
	);
}

/**
 * Предикат повторимости ошибки сохранения принятого визита.
 */
export function acceptedVisitSaveFailureIsRetryable(error: unknown): boolean {
	if (!(error instanceof WorkflowResponseError)) return true;
	return (
		error.status === 0 ||
		error.status === 408 ||
		error.status === 429 ||
		error.status >= 500
	);
}
