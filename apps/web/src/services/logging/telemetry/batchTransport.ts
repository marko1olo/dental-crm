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
	generateUuidV7,
	type StaffActionAuditEntry,
} from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import { openOfflineOutboxDb } from "../../offline/storage/idbDatabase.js";
import {
	LEGACY_OFFLINE_STAFF_AUDIT_KEY,
	LOCAL_STORAGE_STAFF_EVENTS_KEY,
	MAX_OFFLINE_STAFF_EVENTS,
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
	} catch (err) {
		activeLoggerBridge?.warn("[StaffTelemetry] LocalStorage quota exceeded", err);
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
		} catch (err) {
			activeLoggerBridge?.warn("[StaffTelemetry] Failed to clear storage keys", err);
		}
	}
}

/**
 * Асинхронный бэкап в IndexedDB для предотвращения потери данных при сбросе кэша
 */
export function backupStaffEventsToIndexedDb(events: StaffActionAuditEntry[]): void {
	if (typeof window === "undefined" || events.length === 0) return;
	void openOfflineOutboxDb()
		.then((idb) => {
			try {
				if (!idb.objectStoreNames.contains(STAFF_AUDIT_IDB_STORE)) return;
				const tx = idb.transaction(STAFF_AUDIT_IDB_STORE, "readwrite");
				const store = tx.objectStore(STAFF_AUDIT_IDB_STORE);
				for (const item of events) {
					store.put(item);
				}
			} catch (err) {
				activeLoggerBridge?.warn("[StaffTelemetry] IDB write failed", err);
			}
		})
		.catch((err) => {
			activeLoggerBridge?.warn("[StaffTelemetry] IDB open failed", err);
		});
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
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				[CORRELATION_ID_HEADER]: correlationId,
				"Idempotency-Key": generateUuidV7(),
			}),
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
 * Fallback-отправка через fetch keepalive (с Idempotency-Key и Correlation-ID) при закрытии вкладки
 */
export function sendTelemetryBeaconFallback(events: StaffActionAuditEntry[]): boolean {
	if (typeof fetch !== "function" || events.length === 0) {
		return false;
	}
	try {
		const correlationId = generateCorrelationId("staff_audit");
		const payload = JSON.stringify({ events });
		void (async () => {
			try {
				const res = await fetch("/api/audit/events/batch", {
					method: "POST",
					keepalive: true,
					credentials: "include",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						[CORRELATION_ID_HEADER]: correlationId,
						"Idempotency-Key": generateUuidV7(),
					}),
					body: payload,
				});
				if (!res.ok) {
					activeLoggerBridge?.warn(
						"[StaffTelemetry] Keepalive dispatch returned HTTP error",
						res.status,
					);
				}
			} catch (err) {
				activeLoggerBridge?.warn(
					"[StaffTelemetry] Keepalive dispatch failed during page unload",
					err,
				);
			}
		})();
		return true;
	} catch (err) {
		activeLoggerBridge?.warn(
			"[StaffTelemetry] Unable to schedule keepalive dispatch",
			err,
		);
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
				.catch((err) => {
					activeLoggerBridge?.warn("[StaffTelemetry] LAN P2P broadcast failed", err);
				});
		}
	} catch (err) {
		activeLoggerBridge?.warn("[StaffTelemetry] LAN P2P dispatch failed", err);
	}
}
