/**
 * safeLocalStorage.test.ts — Unit tests for safeLocalStorage debouncing and in-memory cache.
 * Compliance: Mandates 8e, 8k, 8n (HDD 5400 RPM & Dual-Core low-spec laptop protection).
 */

import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageGetItemAsync,
	hydrateLocalStorageFromIdbFallback,
	flushPendingStorageWrites,
	clearInMemoryStorageCache,
	DENTE_STAFF_TOKEN_KEY,
	DENTE_CLINIC_TOKEN_KEY,
	PATIENT_TOKEN_KEY,
	readDenteStaffToken,
	readDenteClinicToken,
	readPatientToken,
} from "../lib/safeLocalStorage.js";

describe("safeLocalStorage — In-Memory Caching & Debounced Disk Writes", () => {
	beforeEach(() => {
		clearInMemoryStorageCache();
	});

	it("сохраняет и мгновенно возвращает значение из in-memory кэша", () => {
		safeLocalStorageSetItem("test_theme_key", "dark");
		const value = safeLocalStorageGetItem("test_theme_key");
		assert.strictEqual(value, "dark");
	});

	it("дебаунсит запись на диск для обычных UI-ключей и поддерживает flushPendingStorageWrites", () => {
		safeLocalStorageSetItem("sidebar_collapsed", "true");
		assert.strictEqual(safeLocalStorageGetItem("sidebar_collapsed"), "true");

		flushPendingStorageWrites();
		assert.strictEqual(safeLocalStorageGetItem("sidebar_collapsed"), "true");
	});

	it("немедленно записывает критические токены авторизации без задержки дебаунса", () => {
		safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, "staff-jwt-token-123");
		assert.strictEqual(readDenteStaffToken(), "staff-jwt-token-123");

		safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, "clinic-jwt-token-456");
		assert.strictEqual(readDenteClinicToken(), "clinic-jwt-token-456");

		safeLocalStorageSetItem(PATIENT_TOKEN_KEY, "patient-otp-token-789");
		assert.strictEqual(readPatientToken(), "patient-otp-token-789");
	});

	it("корректно удаляет записи из кэша и хранилища через safeLocalStorageRemoveItem", () => {
		safeLocalStorageSetItem("temp_key", "to_be_deleted");
		assert.strictEqual(safeLocalStorageGetItem("temp_key"), "to_be_deleted");

		safeLocalStorageRemoveItem("temp_key");
		assert.strictEqual(safeLocalStorageGetItem("temp_key"), null);
	});

	it("seamlessly falls back to IndexedDB when localStorage throws QuotaExceededError", async () => {
		const mockStoreData: { keyPath: string; records: Map<string, unknown> } = {
			keyPath: "key",
			records: new Map(),
		};
		const mockIdb = {
			open: (_name: string, _ver: number) => {
				const req = {
					result: {
						objectStoreNames: {
							contains: (n: string) => n === "storage_kv",
						},
						createObjectStore: (n: string, opts: { keyPath: string }) => {
							mockStoreData.keyPath = opts.keyPath;
							return {};
						},
						transaction: (_store: string, _mode: string) => ({
							objectStore: (_s: string) => ({
								put: (val: Record<string, unknown>) => {
									const key = String(val[mockStoreData.keyPath]);
									mockStoreData.records.set(key, val);
									const putReq = { onsuccess: null as any, onerror: null as any };
									queueMicrotask(() => putReq.onsuccess?.());
									return putReq;
								},
								get: (key: string) => {
									const getReq = {
										result: mockStoreData.records.get(key) ?? null,
										onsuccess: null as any,
										onerror: null as any,
									};
									queueMicrotask(() => getReq.onsuccess?.());
									return getReq;
								},
								delete: (key: string) => {
									mockStoreData.records.delete(key);
									const delReq = { onsuccess: null as any, onerror: null as any };
									queueMicrotask(() => delReq.onsuccess?.());
									return delReq;
								},
								getAll: () => {
									const allReq = {
										result: Array.from(mockStoreData.records.values()),
										onsuccess: null as any,
										onerror: null as any,
									};
									queueMicrotask(() => allReq.onsuccess?.());
									return allReq;
								},
							}),
						}),
					},
					onsuccess: null as any,
					onerror: null as any,
					onupgradeneeded: null as any,
				};
				queueMicrotask(() => {
					req.onupgradeneeded?.();
					req.onsuccess?.();
				});
				return req;
			},
		};

		(globalThis as any).indexedDB = mockIdb;
		if (typeof window !== "undefined") {
			(window as any).indexedDB = mockIdb;
		}

		const mockLocalStorage = {
			getItem: (_k: string) => null,
			setItem: (_k: string, _v: string) => {
				const err = new Error("QuotaExceededError: DOM Exception 22");
				err.name = "QuotaExceededError";
				(err as any).code = 22;
				throw err;
			},
			removeItem: (_k: string) => {},
			key: (_i: number) => null,
			length: 0,
			clear: () => {},
		};

		const prevGlobalStorage = (globalThis as any).localStorage;
		const prevWindowStorage = typeof window !== "undefined" ? (window as any).localStorage : undefined;
		(globalThis as any).localStorage = mockLocalStorage;
		if (typeof window !== "undefined") {
			(window as any).localStorage = mockLocalStorage;
		}

		try {
			const success = safeLocalStorageSetItem("heavy_clinical_field", "huge_payload_value", true);
			assert.strictEqual(success, true);

			assert.strictEqual(safeLocalStorageGetItem("heavy_clinical_field"), "huge_payload_value");

			// Allow asynchronous IDB fallback write to settle
			await new Promise((r) => setTimeout(r, 20));

			// Clear in-memory cache to simulate fresh session / tab restart
			clearInMemoryStorageCache();
			(globalThis as any).indexedDB = mockIdb;
			if (typeof window !== "undefined") {
				(window as any).indexedDB = mockIdb;
			}

			// In-memory cache is empty now; safeLocalStorageGetItemAsync reads from IndexedDB fallback
			const asyncVal = await safeLocalStorageGetItemAsync("heavy_clinical_field");
			assert.strictEqual(asyncVal, "huge_payload_value");

			// In-memory cache was hydrated by the read; sync get works!
			assert.strictEqual(safeLocalStorageGetItem("heavy_clinical_field"), "huge_payload_value");

			// Test hydrateLocalStorageFromIdbFallback
			clearInMemoryStorageCache();
			(globalThis as any).indexedDB = mockIdb;
			if (typeof window !== "undefined") {
				(window as any).indexedDB = mockIdb;
			}

			const hydratedCount = await hydrateLocalStorageFromIdbFallback();
			assert.strictEqual(hydratedCount, 1);
			assert.strictEqual(safeLocalStorageGetItem("heavy_clinical_field"), "huge_payload_value");

			// Test remove cleans from IDB fallback
			safeLocalStorageRemoveItem("heavy_clinical_field");
			await new Promise((r) => setTimeout(r, 20));
			assert.strictEqual(safeLocalStorageGetItem("heavy_clinical_field"), null);
		} finally {
			(globalThis as any).localStorage = prevGlobalStorage;
			if (typeof window !== "undefined") {
				(window as any).localStorage = prevWindowStorage;
			}
			delete (globalThis as any).indexedDB;
			if (typeof window !== "undefined") {
				delete (window as any).indexedDB;
			}
		}
	});
});
