/**
 * apiAuthFetch.ts — единая точка подстановки токенов авторизации в запросы к API.
 *
 * ЗАЧЕМ ЭТО НУЖНО
 * В приложении около сотни прямых вызовов `fetch("/api/...")`, и подавляющее
 * большинство не передавало ни одного заголовка авторизации. Сервер поэтому был
 * вынужден определять клинику по заголовку `x-organization-id`, который присылает
 * сам клиент, — то есть кто угодно мог подставить UUID чужой клиники и получить
 * доступ к её карточкам пациентов.
 *
 * Чтобы закрыть дыру на сервере, не переписывая все вызовы, здесь один раз
 * оборачивается глобальный `fetch`: любой запрос к своему `/api/` автоматически
 * получает токен кабинета и токен сотрудника из localStorage. Явно заданные
 * заголовки не перезаписываются — вызовы, которые уже передают токен
 * (например, вход по PIN), продолжают работать как прежде.
 *
 * Установка вызывается один раз в main.tsx до рендера приложения.
 */

import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageGetItem,
} from "./safeLocalStorage";

const CLINIC_TOKEN_STORAGE_KEY = DENTE_CLINIC_TOKEN_KEY;
const STAFF_TOKEN_STORAGE_KEY = DENTE_STAFF_TOKEN_KEY;
const CLINIC_TOKEN_HEADER = "x-dente-clinic-token";
const STAFF_TOKEN_HEADER = "x-dente-staff-token";

const INSTALLED_FLAG = "__denteApiAuthFetchInstalled";

/** Публичные маршруты, которым токен не нужен (и не должен утекать наружу). */
const PUBLIC_API_PREFIXES = [
	"/api/public/",
	"/api/portal/",
	"/api/auth/",
] as const;

function readToken(key: string): string | null {
	const value = safeLocalStorageGetItem(key);
	return value && value.trim() ? value : null;
}

function requestUrlOf(input: RequestInfo | URL): string {
	if (typeof input === "string") return input;
	if (input instanceof URL) return input.toString();
	return input.url;
}

/**
 * true — если запрос идёт к нашему собственному API и требует авторизации.
 * Токен не должен уходить на сторонние домены, поэтому абсолютные URL
 * проверяются на совпадение origin.
 */
export function shouldAttachApiAuth(rawUrl: string): boolean {
	let pathname: string;
	try {
		const parsed = new URL(rawUrl, window.location.origin);
		if (parsed.origin !== window.location.origin) return false;
		pathname = parsed.pathname;
	} catch {
		return false;
	}

	if (!pathname.startsWith("/api/")) return false;
	return !PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function installApiAuthFetch(): void {
	if (typeof window === "undefined") return;
	const globalWindow = window as unknown as Record<string, unknown>;
	if (globalWindow[INSTALLED_FLAG]) return;
	globalWindow[INSTALLED_FLAG] = true;

	const originalFetch = window.fetch.bind(window);

	window.fetch = async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		if (!shouldAttachApiAuth(requestUrlOf(input))) {
			return originalFetch(input, init);
		}

		const clinicToken = readToken(CLINIC_TOKEN_STORAGE_KEY);
		const staffToken = readToken(STAFF_TOKEN_STORAGE_KEY);
		if (!clinicToken && !staffToken) {
			return originalFetch(input, init);
		}

		// Заголовки могут быть заданы в init, а могут — в объекте Request.
		const headers = new Headers(
			init?.headers ?? (input instanceof Request ? input.headers : undefined),
		);
		if (clinicToken && !headers.has(CLINIC_TOKEN_HEADER))
			headers.set(CLINIC_TOKEN_HEADER, clinicToken);
		if (staffToken && !headers.has(STAFF_TOKEN_HEADER))
			headers.set(STAFF_TOKEN_HEADER, staffToken);

		if (input instanceof Request && !init) {
			return originalFetch(new Request(input, { headers }));
		}
		return originalFetch(input, { ...(init ?? {}), headers });
	};
}
