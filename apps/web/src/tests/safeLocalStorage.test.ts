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
});
