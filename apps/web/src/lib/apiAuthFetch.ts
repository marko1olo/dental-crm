/**
 * apiAuthFetch.ts — единая точка подстановки токенов авторизации в запросы к API
 * с оптимизацией in-memory кэширования заголовков и защитой от HDD thrashing.
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
 * получает токен кабинета и токен сотрудника.
 *
 * ОПТИМИЗАЦИЯ ПРОТИВ HDD THRASHING:
 * В старой версии на КАЖДЫЙ fetch вызывался синхронный `safeLocalStorageGetItem`
 * дважды (clinicToken и staffToken). На медленных механических дисках (5400 RPM)
 * это приводило к постоянным блокировкам основного потока.
 * Теперь токены хранятся в оперативной памяти модуля (0 мс доступ),
 * обновляются по событиям StorageEvent (межвкладочная синхронизация) и не дергают диск.
 *
 * КЭШИРОВАНИЕ СПРАВОЧНИКОВ:
 * Запросы к регламентным справочникам (804н, МКБ-10, прейскуранты, структура клиники)
 * обслуживаются через apiCacheEngine в оперативной памяти, а мутирующие запросы
 * (POST/PUT/PATCH/DELETE) автоматически сбрасывают соответствующий кэш.
 *
 * Установка вызывается один раз в main.tsx до рендера приложения.
 */

import {
	createResponseFromCachedEntry,
	getCachedApiResponse,
	headersToRecord,
	isCacheableCatalogUrl,
	normalizeApiUrl,
	notifyApiMutation,
	readCatalogFromPersistentStorage,
	setCachedApiResponse,
} from "./apiCacheEngine";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
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

// ---------------------------------------------------------------------------
// IN-MEMORY TOKEN CACHE (ZERO-DISK IN HOT PATH)
// ---------------------------------------------------------------------------

let cachedClinicToken: string | null = null;
let cachedStaffToken: string | null = null;
let tokenCacheInitialized = false;
let storageListenerAttached = false;

/**
 * Инициализирует кэш токенов в оперативной памяти один раз из localStorage.
 */
function initTokenCache(): void {
	if (tokenCacheInitialized) return;

	cachedClinicToken = safeLocalStorageGetItem(CLINIC_TOKEN_STORAGE_KEY)?.trim() || null;
	cachedStaffToken = safeLocalStorageGetItem(STAFF_TOKEN_STORAGE_KEY)?.trim() || null;
	tokenCacheInitialized = true;

	if (
		typeof window !== "undefined" &&
		typeof window.addEventListener === "function" &&
		!storageListenerAttached
	) {
		storageListenerAttached = true;
		window.addEventListener("storage", (event: StorageEvent) => {
			if (event.key === CLINIC_TOKEN_STORAGE_KEY) {
				cachedClinicToken = event.newValue?.trim() || null;
			} else if (event.key === STAFF_TOKEN_STORAGE_KEY) {
				cachedStaffToken = event.newValue?.trim() || null;
			} else if (event.key === null) {
				// Вызов localStorage.clear() очищает все токены
				cachedClinicToken = null;
				cachedStaffToken = null;
			}
		});
	}
}

/**
 * Возвращает токен из оперативной памяти (0 мс, без вызова localStorage.getItem).
 */
function readToken(key: string): string | null {
	initTokenCache();
	if (key === CLINIC_TOKEN_STORAGE_KEY) {
		return cachedClinicToken ?? (readDenteClinicToken() || null);
	}
	if (key === STAFF_TOKEN_STORAGE_KEY) {
		return cachedStaffToken ?? (readDenteStaffToken() || null);
	}
	const value = safeLocalStorageGetItem(key);
	return value?.trim() ? value : null;
}

/**
 * Принудительно обновляет токены в оперативной памяти без повторного чтения диска.
 */
export function setCachedAuthTokens(tokens: {
	clinicToken?: string | null;
	staffToken?: string | null;
}): void {
	initTokenCache();
	if (tokens.clinicToken !== undefined) {
		cachedClinicToken = tokens.clinicToken?.trim() || null;
		if (tokens.clinicToken) {
			safeLocalStorageSetItem(CLINIC_TOKEN_STORAGE_KEY, tokens.clinicToken);
		} else {
			safeLocalStorageRemoveItem(CLINIC_TOKEN_STORAGE_KEY);
		}
	}
	if (tokens.staffToken !== undefined) {
		cachedStaffToken = tokens.staffToken?.trim() || null;
		if (tokens.staffToken) {
			safeLocalStorageSetItem(STAFF_TOKEN_STORAGE_KEY, tokens.staffToken);
		} else {
			safeLocalStorageRemoveItem(STAFF_TOKEN_STORAGE_KEY);
		}
	}
}

/**
 * Очищает закэшированные в памяти токены (например, при выходе из кабинета).
 */
export function clearCachedAuthTokens(): void {
	initTokenCache();
	cachedClinicToken = null;
	cachedStaffToken = null;
	safeLocalStorageRemoveItem(CLINIC_TOKEN_STORAGE_KEY);
	safeLocalStorageRemoveItem(STAFF_TOKEN_STORAGE_KEY);
}

/**
 * Возвращает текущие токены из оперативной памяти.
 */
export function getCachedAuthTokens(): {
	clinicToken: string | null;
	staffToken: string | null;
} {
	initTokenCache();
	return {
		clinicToken: cachedClinicToken,
		staffToken: cachedStaffToken,
	};
}

/**
 * Принудительно перечитывает токены из хранилища (если они были изменены сторонним кодом).
 */
export function syncAuthTokensFromStorage(): void {
	cachedClinicToken = safeLocalStorageGetItem(CLINIC_TOKEN_STORAGE_KEY)?.trim() || null;
	cachedStaffToken = safeLocalStorageGetItem(STAFF_TOKEN_STORAGE_KEY)?.trim() || null;
	tokenCacheInitialized = true;
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
		const origin = typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost";
		const parsed = new URL(rawUrl, origin);
		if (typeof window !== "undefined" && window.location && parsed.origin !== window.location.origin) {
			return false;
		}
		pathname = parsed.pathname;
	} catch {
		return false;
	}

	if (!pathname.startsWith("/api/")) return false;
	return !PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Пул параллельных запросов справочников в полете (дедупликация)
const catalogInFlight = new Map<string, Promise<Response>>();
const revalidatingCatalogUrls = new Set<string>();

function scheduleBackgroundCatalogRevalidation(
	rawUrl: string,
	requestInput: RequestInfo | URL,
	requestInit: RequestInit | undefined,
	originalFetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
	const normalizedKey = normalizeApiUrl(rawUrl);
	if (revalidatingCatalogUrls.has(normalizedKey)) return;
	if (typeof navigator !== "undefined" && navigator.onLine === false) return;

	revalidatingCatalogUrls.add(normalizedKey);

	const executeRevalidation = async () => {
		try {
			const response = await originalFetchFn(requestInput, requestInit);
			if (response.ok) {
				const contentType = response.headers.get("content-type") || "";
				if (contentType.includes("application/json")) {
					const json = await response.json();
					setCachedApiResponse(normalizedKey, json, {
						status: response.status,
						statusText: response.statusText,
						headers: headersToRecord(response.headers),
					});
				} else {
					const text = await response.text();
					setCachedApiResponse(normalizedKey, text, {
						status: response.status,
						statusText: response.statusText,
						headers: headersToRecord(response.headers),
					});
				}
				if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
					window.dispatchEvent(
						new CustomEvent("dente:catalog-updated", {
							detail: { url: normalizedKey },
						}),
					);
				}
			}
		} catch {
			// Background revalidation is non-blocking and silent
		} finally {
			revalidatingCatalogUrls.delete(normalizedKey);
		}
	};

	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		window.requestIdleCallback(() => void executeRevalidation(), { timeout: 3000 });
	} else {
		setTimeout(() => void executeRevalidation(), 500);
	}
}

export function installApiAuthFetch(): void {
	if (typeof window === "undefined") return;
	const globalWindow = window as unknown as Record<string, unknown>;
	if (globalWindow[INSTALLED_FLAG]) return;
	globalWindow[INSTALLED_FLAG] = true;

	const originalFetch = window.fetch ? window.fetch.bind(window) : globalThis.fetch.bind(globalThis);

	window.fetch = async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const rawUrl = requestUrlOf(input);
		const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

		// Мутации (POST/PUT/PATCH/DELETE) автоматически сбрасывают затронутые справочники в кэше
		if (method !== "GET" && method !== "HEAD") {
			notifyApiMutation(rawUrl, method);
		}

		if (!shouldAttachApiAuth(rawUrl)) {
			return originalFetch(input, init);
		}

		const clinicToken = readToken(CLINIC_TOKEN_STORAGE_KEY);
		const staffToken = readToken(STAFF_TOKEN_STORAGE_KEY);

		// Формируем заголовки авторизации без лишней нагрузки на сборщик мусора
		const headers = new Headers(
			init?.headers ?? (input instanceof Request ? input.headers : undefined),
		);
		if (clinicToken && !headers.has(CLINIC_TOKEN_HEADER)) {
			headers.set(CLINIC_TOKEN_HEADER, clinicToken);
		}
		if (staffToken && !headers.has(STAFF_TOKEN_HEADER)) {
			headers.set(STAFF_TOKEN_HEADER, staffToken);
		}

		const requestInput = input instanceof Request && !init ? new Request(input, { headers }) : input;
		const requestInit = input instanceof Request && !init ? undefined : { ...(init ?? {}), headers };

		// Проверяем кэш для безопасных GET-запросов регламентных справочников
		const cacheControl = init?.cache ?? (input instanceof Request ? input.cache : undefined);
		const bypassCache = cacheControl === "no-store" || cacheControl === "no-cache";

		if (method === "GET" && !bypassCache && isCacheableCatalogUrl(rawUrl, method)) {
			const cached = getCachedApiResponse(rawUrl);
			if (cached) {
				// True Stale-While-Revalidate: return 0ms cached response immediately,
				// and revalidate in background idle if older than 60s
				if (Date.now() - cached.timestamp > 60_000) {
					scheduleBackgroundCatalogRevalidation(rawUrl, requestInput, requestInit, originalFetch);
				}
				return createResponseFromCachedEntry(cached);
			}

			// Если в оперативной памяти промах (например, после открытия вкладки),
			// проверяем persistent IndexedDB кэш (0 мс сетевых затрат)
			const persistent = await readCatalogFromPersistentStorage(rawUrl);
			if (persistent) {
				setCachedApiResponse(rawUrl, persistent.data, {
					status: persistent.status,
					statusText: persistent.statusText,
					headers: persistent.headers,
					ttlMs: persistent.ttlMs,
				});
				if (Date.now() - persistent.timestamp > 60_000) {
					scheduleBackgroundCatalogRevalidation(rawUrl, requestInput, requestInit, originalFetch);
				}
				return createResponseFromCachedEntry(persistent);
			}

			// Защита от Cache Stampede: если такой же справочник уже загружается — ждем его
			const normalizedKey = normalizeApiUrl(rawUrl);
			const inFlight = catalogInFlight.get(normalizedKey);
			if (inFlight) {
				const sharedResponse = await inFlight;
				return sharedResponse.clone();
			}
		}

		// Если это кэшируемый справочник — оборачиваем запрос для кэширования ответа в RAM
		if (method === "GET" && !bypassCache && isCacheableCatalogUrl(rawUrl, method)) {
			const normalizedKey = normalizeApiUrl(rawUrl);

			const fetchOperation = (async () => {
				const response = await originalFetch(requestInput, requestInit);
				if (response.ok) {
					try {
						const cloneForCache = response.clone();
						const contentType = cloneForCache.headers.get("content-type") || "";
						if (contentType.includes("application/json")) {
							const json = await cloneForCache.json();
							setCachedApiResponse(normalizedKey, json, {
								status: cloneForCache.status,
								statusText: cloneForCache.statusText,
								headers: headersToRecord(cloneForCache.headers),
							});
						} else {
							const text = await cloneForCache.text();
							setCachedApiResponse(normalizedKey, text, {
								status: cloneForCache.status,
								statusText: cloneForCache.statusText,
								headers: headersToRecord(cloneForCache.headers),
							});
						}
					} catch {
						// Не блокируем основной ответ при ошибке парсинга кэша
					}
				}
				return response;
			})();

			catalogInFlight.set(normalizedKey, fetchOperation);

			try {
				const result = await fetchOperation;
				return result;
			} finally {
				catalogInFlight.delete(normalizedKey);
			}
		}

		if (input instanceof Request && !init) {
			return originalFetch(requestInput);
		}
		return originalFetch(input, requestInit);
	};
}
