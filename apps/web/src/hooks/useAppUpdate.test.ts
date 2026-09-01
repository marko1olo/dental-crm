/**
 * useAppUpdate.test.ts — Модульные тесты для логики OTA обновлений и Rollback защиты.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import test, { beforeEach } from "node:test";
import {
	DEFAULT_BASE_VERSION,
	MAX_CONSECUTIVE_CRASHES_BEFORE_ROLLBACK,
	STORAGE_KEYS,
	computeSha256,
	getInstalledOtaVersion,
	markAppBootStable,
	recordBootCrashAndCheckRollback,
	safeGetStorage,
	safeRemoveStorage,
	safeSetStorage,
} from "./useAppUpdate.js";

// Mock localStorage in node environment
const mockStorage = new Map<string, string>();
const fakeLocalStorage: Storage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, value: string) => {
		mockStorage.set(key, value);
	},
	removeItem: (key: string) => {
		mockStorage.delete(key);
	},
	clear: () => {
		mockStorage.clear();
	},
	key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
	get length() {
		return mockStorage.size;
	},
};

(globalThis as unknown as { window: { localStorage: Storage } }).window = {
	localStorage: fakeLocalStorage,
};

test("computeSha256 вычисляет математически точный SHA-256 хеш", async () => {
	const text = "DENTE OTA Update Bundle Payload Verification";
	const buffer = Buffer.from(text, "utf-8");

	const expectedSha256 = crypto
		.createHash("sha256")
		.update(buffer)
		.digest("hex");

	const actualSha256 = await computeSha256(buffer);

	assert.equal(
		actualSha256,
		expectedSha256,
		"Вычисленный SHA-256 обязан в точности совпадать со стандартным криптографическим дайджестом",
	);
});

test("Rollback Protection: защищает от окирпичивания при многократных сбоях запуска", () => {
	mockStorage.clear();

	// 1. Устанавливаем стабильную версию 2.0.0
	safeSetStorage(STORAGE_KEYS.ACTIVE_VERSION, "2.0.0");
	markAppBootStable();
	assert.equal(
		safeGetStorage(STORAGE_KEYS.LAST_KNOWN_GOOD_VERSION),
		"2.0.0",
	);
	assert.equal(safeGetStorage(STORAGE_KEYS.CRASH_COUNT), "0");

	// 2. Накатываем нестабильное обновление 2.5.0-broken
	safeSetStorage(STORAGE_KEYS.ACTIVE_VERSION, "2.5.0-broken");
	safeSetStorage(STORAGE_KEYS.PENDING_VERSION, "2.5.0-broken");

	// 3. Первый сбой при запуске
	const firstCrash = recordBootCrashAndCheckRollback();
	assert.equal(firstCrash.crashCount, 1);
	assert.equal(firstCrash.shouldRollback, false);
	assert.equal(
		safeGetStorage(STORAGE_KEYS.ACTIVE_VERSION),
		"2.5.0-broken",
		"После первого сбоя версия еще не откатывается",
	);

	// 4. Второй сбой подряд (превышение порога)
	const secondCrash = recordBootCrashAndCheckRollback();
	assert.equal(secondCrash.crashCount, 2);
	assert.equal(secondCrash.shouldRollback, true);
	assert.equal(secondCrash.rollbackVersion, "2.0.0");

	// 5. Проверяем, что активная версия откатилась на Last Known Good
	assert.equal(
		safeGetStorage(STORAGE_KEYS.ACTIVE_VERSION),
		"2.0.0",
		"Активная версия обязана быть восстановлена до Last Known Good (2.0.0)",
	);
	assert.equal(
		safeGetStorage(STORAGE_KEYS.PENDING_VERSION),
		null,
		"Битый черновик обновления обязан быть удален",
	);
});

test("markAppBootStable сбрасывает счетчик сбоев после успешной стабилизации", () => {
	mockStorage.clear();
	safeSetStorage(STORAGE_KEYS.ACTIVE_VERSION, "2.4.0");
	safeSetStorage(STORAGE_KEYS.CRASH_COUNT, "1");

	markAppBootStable();

	assert.equal(safeGetStorage(STORAGE_KEYS.CRASH_COUNT), "0");
	assert.equal(
		safeGetStorage(STORAGE_KEYS.LAST_KNOWN_GOOD_VERSION),
		"2.4.0",
	);
});
