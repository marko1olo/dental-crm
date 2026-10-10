/**
 * Канонический тонкий фасад безопасного доступа к localStorage / sessionStorage (Мандат 8b).
 * Вся бизнес-логика декомпозирована в модульную директорию `./safeStorageModules/`.
 */

export {
	DENTE_STAFF_TOKEN_KEY,
	DENTE_CLINIC_TOKEN_KEY,
	PATIENT_TOKEN_KEY,
	DENTE_INACTIVITY_TIMEOUT_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	IDB_FALLBACK_DB_NAME,
	IDB_FALLBACK_STORE_NAME,
	IDB_FALLBACK_VERSION,
	safeGetCookie,
	safeSetCookie,
	safeDeleteCookie,
	isQuotaExceededError,
	isIdbStorageFallbackAvailable,
	openIdbFallbackDb,
	saveIdbStorageFallback,
	getIdbStorageFallback,
	removeIdbStorageFallback,
	hydrateLocalStorageFromIdbFallback,
	resetIdbFallbackConnection,
	evictDisposableLocalStorageKeys,
	flushPendingSessionStorageWrites,
	flushPendingStorageWrites,
	clearInMemoryStorageCache,
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
	readDenteStaffToken,
	readDenteClinicToken,
	resetInMemoryAuthTokens,
	readPatientToken,
	safeSessionStorageGetItem,
	safeSessionStorageSetItem,
	safeSessionStorageRemoveItem,
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
	parseJsonNonBlocking,
	safeLocalStorageGetItemAsync,
	safeLocalStorageGetJsonAsync,
} from "./safeStorageModules/index.js";

export * from "./safeStorageModules/index.js";
