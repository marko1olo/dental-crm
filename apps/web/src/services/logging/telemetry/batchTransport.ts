/**
 * DENTE CRM — Telemetry Backend Transport & Persistence Layer
 *
 * Отвечает за:
 * 1. Сетевую пакетную передачу в /api/audit/events/batch (HTTP POST) с Correlation-ID.
 * 2. Beacon fallback при выгрузке страницы.
 * 3. Локальное хранение (localStorage + IndexedDB backup).
 * 4. P2P трансляцию по локальной сети клиники (LAN P2P).
 * 5. Регистрацию системного логгер-моста.
 */

import {
	CORRELATION_ID_HEADER,
	generateCorrelationId,
	type StaffActionAuditEntry,
} from "@dental/shared";
import {
	LEGACY_OFFLINE_STAFF_AUDIT_KEY,
	LOCAL_STORAGE_STAFF_EVENTS_KEY,
	MAX_OFFLINE_STAFF_EVENTS,
	STAFF_AUDIT_IDB_NAME,
	STAFF_AUDIT_IDB_STORE,
	type TelemetryLoggerBridge,
} from "./types.js";

let activeLoggerBridge: TelemetryLoggerBridge | null = null;

export function registerTelemetryLoggerBridge(bridge: TelemetryLoggerBridge | null): void {
	activeLoggerBridge = bridge;
}

export function getActiveLoggerBridge(): TelemetryLoggerBridge | null {
	return activeLoggerBridge;
}

/**
 * Загрузка сохраненных событий аудита из localStorage с миграцией legacy-ключа
 */
export function loadStaffEventsFromStorage(): StaffActionAuditEntry[] {
	const storage =
		typeof window !== "undefined" && window.localStorage
			? window.localStorage
			: typeof localStorage !== "undefined"
				? localStorage
				: null;
	if (!storage) return [];
	try {
		const saved = storage.getItem(LOCAL_STORAGE_STAFF_EVENTS_KEY);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (Array.isArray(parsed)) {
				return parsed.slice(-MAX_OFFLINE_STAFF_EVENTS);
			}
		} else {
			// Fallback: миграция из legacy-ключа
			const legacySaved = storage.getItem(LEGACY_OFFLINE_STAFF_AUDIT_KEY);
			if (legacySaved) {
				const parsed = JSON.parse(legacySaved);
				if (Array.isArray(parsed) && parsed.length > 0) {
					const events = parsed.slice(-MAX_OFFLINE_STAFF_EVENTS);
					saveStaffEventsToStorage(events);
					return events;
				}
			}
		}
	} catch {
		return [];
	}
	return [];
}

/**
 * Сохранение очереди событий в localStorage и IndexedDB
 */
export function saveStaffEventsToStorage(events: StaffActionAuditEntry[]): void {
	const storage =
		typeof window !== "undefined" && window.localStorage
			? window.localStorage
			: typeof localStorage !== "undefined"
				? localStorage
				: null;
	if (!storage) return;
	try {
		const serialized = JSON.stringify(events);
		storage.setItem(LOCAL_STORAGE_STAFF_EVENTS_KEY, serialized);
		// Зеркалируем в legacy-ключ для 100% совместимости
		storage.setItem(LEGACY_OFFLINE_STAFF_AUDIT_KEY, serialized);
	} catch {
		// Игнорируем ошибку переполнения квоты localStorage
	}
	backupStaffEventsToIndexedDb(events);
}

/**
 * Удаление сохраненных событий из хранилища
 */
export function clearStaffEventsFromStorage(): void {
	const storage =
		typeof window !== "undefined" && window.localStorage
			? window.localStorage
			: typeof localStorage !== "undefined"
				? localStorage
				: null;
	if (storage) {
		try {
			storage.removeItem(LOCAL_STORAGE_STAFF_EVENTS_KEY);
			storage.removeItem(LEGACY_OFFLINE_STAFF_AUDIT_KEY);
		} catch {
			// ignore
		}
	}
}

/**
 * Асинхронный бэкап в IndexedDB для предотвращения потери данных при сбросе кэша
 */
export function backupStaffEventsToIndexedDb(events: StaffActionAuditEntry[]): void {
	if (typeof window === "undefined" || !window.indexedDB) return;
	try {
		const req = window.indexedDB.open(STAFF_AUDIT_IDB_NAME, 1);
		req.onupgradeneeded = (e) => {
			const idb = (e.target as IDBOpenDBRequest).result;
			if (!idb.objectStoreNames.contains(STAFF_AUDIT_IDB_STORE)) {
				idb.createObjectStore(STAFF_AUDIT_IDB_STORE, { keyPath: "id" });
			}
		};
		req.onsuccess = (e) => {
			try {
				const idb = (e.target as IDBOpenDBRequest).result;
				const tx = idb.transaction(STAFF_AUDIT_IDB_STORE, "readwrite");
				const store = tx.objectStore(STAFF_AUDIT_IDB_STORE);
				for (const item of events) {
					store.put(item);
				}
				tx.oncomplete = () => idb.close();
				tx.onerror = () => idb.close();
			} catch {
				// non-blocking Doctor Autonomy
			}
		};
		req.onerror = () => {};
	} catch {
		// non-blocking Doctor Autonomy
	}
}

/**
 * Пакетная отправка событий телеметрии на сервер
 */
export async function sendTelemetryBatch(events: StaffActionAuditEntry[]): Promise<boolean> {
	if (events.length === 0) return false;
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		return false;
	}

	try {
		const correlationId = generateCorrelationId("staff_audit");
		const response = await fetch("/api/audit/events/batch", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				[CORRELATION_ID_HEADER]: correlationId,
			},
			credentials: "include",
			body: JSON.stringify({ events }),
		});

		if (response.ok) {
			return true;
		}

		if (activeLoggerBridge) {
			activeLoggerBridge.warn(
				`[StaffTelemetry] Не удалось отправить аудит-события: статус ${response.status}`,
			);
		}
		return false;
	} catch (err) {
		// Сетевой сбой: оставляем события в очереди для следующей попытки
		if (activeLoggerBridge) {
			activeLoggerBridge.warn(
				"[StaffTelemetry] Ошибка сети при отправке телеметрии персонала",
				err,
			);
		}
		return false;
	}
}

/**
 * Fallback-отправка через Beacon API при закрытии вкладки
 */
export function sendTelemetryBeaconFallback(events: StaffActionAuditEntry[]): boolean {
	if (typeof navigator === "undefined" || !navigator.sendBeacon || events.length === 0) {
		return false;
	}
	try {
		const payload = JSON.stringify({ events });
		const blob = new Blob([payload], { type: "application/json" });
		return navigator.sendBeacon("/api/audit/events/batch", blob);
	} catch {
		return false;
	}
}

/**
 * Трансляция события по локальной сети клиники (LAN P2P)
 */
export function broadcastStaffActionToLan(entry: StaffActionAuditEntry): void {
	try {
		// Don't initialize LAN mesh background intervals during headless Node unit tests
		if (
			typeof process !== "undefined" &&
			(process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST))
		) {
			return;
		}
		if (typeof window !== "undefined" && typeof window.document?.createElement === "function") {
			import("../../offline/lanP2PDispatcher.js")
				.then(({ lanP2PDispatcher }) => {
					void lanP2PDispatcher.broadcastStaffAction(entry);
				})
				.catch(() => {
					// Non-blocking Doctor Autonomy
				});
		}
	} catch {
		// Non-blocking Doctor Autonomy
	}
}
