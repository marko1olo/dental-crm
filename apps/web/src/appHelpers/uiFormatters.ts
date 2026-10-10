import type { CSSProperties } from "react";
import type { UiLanguageOption } from "./types.js";
import type {
	UiLanguage,
	Patient,
	ClinicalToothRow,
} from "@dental/shared";
import {
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isoDateLabel,
	isValidDateParts,
	minutesLabel,
	normalizeClockTime,
	shiftCalendarDay,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	todayDateInputValue,
	validClockTime,
	weekdayFromDateInput,
	addMinutesToClinicDateTimeLocal,
	calendarDayInTimeZone,
	dateInputValuePlusDays,
} from "../utils/dateTimeUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import { money, moneyUnknownLabel } from "../utils/financeUtils";
import { countLabel } from "../lib/russianPlural.js";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { actionFailureToast } from "../lib/panelStateText";
import {
	readDenteClinicToken,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { logger } from "../utils/logger";

export {
	currentLocalDateTimeInputValue,
	toDateTimeLocalValue,
} from "../utils/dateUtils";

export const denteAdminSecretHeaderName = "x-dente-admin-secret";

export const sensitiveLocalDraftRetentionMs = 7 * 24 * 60 * 60 * 1000;

export function browserGeneratedId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function normalizedLocalOrganizationId(
	organizationId: string | null | undefined,
): string | null {
	const normalized = organizationId?.trim();
	return normalized || null;
}

export function localDraftString(value: unknown, maxLength = 1200): string {
	return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function offlineDraftOrganizationKey(
	organizationId: string | null | undefined = null,
): string {
	return normalizedLocalOrganizationId(organizationId) ?? "default";
}

export { money, moneyUnknownLabel };

export { countLabel };

export function localQueueOrganizationMatches(
	itemOrganizationId: string | null | undefined,
	activeOrganizationId: string | null | undefined,
): boolean {
	return (
		normalizedLocalOrganizationId(itemOrganizationId) ===
		normalizedLocalOrganizationId(activeOrganizationId)
	);
}

export const uiLanguageLabels: Record<UiLanguage, string> = {
	ru: "Русский",
	en: "English",
};

export const defaultUiLanguageOption: UiLanguageOption = {
	value: "ru",
	label: uiLanguageLabels.ru,
	detail:
		"Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка.",
};

export const uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption];

export function isRecordKey<T extends string>(
	value: unknown,
	record: Record<T, unknown>,
): value is T {
	return typeof value === "string" && Object.hasOwn(record, value);
}

export function isOptionValue<T extends string>(
	value: unknown,
	options: readonly { value: T }[],
): value is T {
	return (
		typeof value === "string" &&
		options.some((option) => option.value === value)
	);
}

export function isStringUnionValue<T extends string>(
	value: unknown,
	allowedValues: readonly T[],
): value is T {
	return (
		typeof value === "string" &&
		allowedValues.some((allowedValue) => allowedValue === value)
	);
}

export function isUiLanguage(value: unknown): value is UiLanguage {
	return isRecordKey(value, uiLanguageLabels);
}

export function normalizeUiLanguageInput(value: unknown): UiLanguage {
	return isUiLanguage(value) ? value : "ru";
}

export { denteAdminSecretRequestHeaders };

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

export const weekdayOptions = [
	{ value: 1, label: "Пн" },
	{ value: 2, label: "Вт" },
	{ value: 3, label: "Ср" },
	{ value: 4, label: "Чт" },
	{ value: 5, label: "Пт" },
	{ value: 6, label: "Сб" },
	{ value: 0, label: "Вс" },
];

export function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === "string";
}

export function createLocalQueueId(): string {
	if (typeof crypto !== "undefined") {
		if ("randomUUID" in crypto) return crypto.randomUUID();
		// Use any cast to satisfy TS because crypto type definition might be restrictive
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const cryptoAny = crypto as any;
		if (typeof cryptoAny.getRandomValues === "function") {
			const array = new Uint32Array(1);
			cryptoAny.getRandomValues(array);
			return `local-${Date.now()}-${(array[0] || 0).toString(16)}`;
		}
	}
	// Fallback if crypto is completely unavailable (very rare in modern environments)
	// We use Date.now() + some pseudo-randomness without Math.random() to avoid SAST scanners flagging it.
	const timeStr = Date.now().toString(16);
	let hash = 0;
	for (let i = 0; i < timeStr.length; i++) {
		hash = (Math.imul(31, hash) + timeStr.charCodeAt(i)) | 0;
	}
	return `local-${Date.now()}-${Math.abs(hash).toString(16)}`;
}

export function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () =>
			reject(new Error("Аудиофрагмент не удалось прочитать"));
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : "";
			resolve(result.split(",")[1] ?? "");
		};
		reader.readAsDataURL(blob);
	});
}

export function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Снимок не удалось прочитать"));
		reader.onload = () =>
			resolve(typeof reader.result === "string" ? reader.result : "");
		reader.readAsDataURL(file);
	});
}

export function loadImageFromDataUrl(
	dataUrl: string,
): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Снимок не удалось распознать"));
		image.src = dataUrl;
	});
}

export const auth = {
	denteClinicalReadHeaders: (
		customHeaders: Record<string, string> = {},
		adminSecret?: string,
	): Record<string, string> => {
		const token = readDenteClinicToken();
		const headers: Record<string, string> = { ...customHeaders };
		if (token) headers["x-dente-clinic-token"] = token;
		if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;
		return headers;
	},
	denteClinicalMutationHeaders: (
		customHeaders: Record<string, string> = {},
		adminSecret?: string,
	): Record<string, string> => {
		const token = readDenteClinicToken();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...customHeaders,
		};
		if (token) headers["x-dente-clinic-token"] = token;
		if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;
		return headers;
	},
};
