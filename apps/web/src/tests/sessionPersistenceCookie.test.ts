/**
 * Тест сессионной стойкости: токены дублируются в cookies и восстанавливаются
 * при очистке localStorage (Мандат 8e / защита от выкидывания из аккаунта).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	readDenteClinicToken,
	readDenteStaffToken,
	resetInMemoryAuthTokens,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
	safeGetCookie,
	safeSetCookie,
	safeDeleteCookie,
	clearInMemoryStorageCache,
} from "../lib/safeLocalStorage.js";

describe("Session Persistence: Cookies + LocalStorage Dual-Tier", () => {
	// Имитируем окружение браузера с document.cookie
	let mockCookieStore = "";

	beforeEach(() => {
		clearInMemoryStorageCache();
		resetInMemoryAuthTokens();
		mockCookieStore = "";

		// Создаем mock document.cookie, если document не определен в Node.js
		if (typeof globalThis.document === "undefined") {
			(globalThis as any).document = {};
		}

		Object.defineProperty(globalThis.document, "cookie", {
			configurable: true,
			get: () => mockCookieStore,
			set: (val: string) => {
				const parts = val.split(";");
				const [kv] = parts;
				if (!kv) return;
				const [key, value] = kv.split("=");
				if (parts.some((p) => p.includes("expires=Thu, 01 Jan 1970"))) {
					// удаление
					const list = mockCookieStore.split("; ").filter((c) => !c.startsWith(`${key}=`));
					mockCookieStore = list.join("; ");
				} else {
					const list = mockCookieStore.split("; ").filter((c) => c && !c.startsWith(`${key}=`));
					list.push(`${key}=${value}`);
					mockCookieStore = list.join("; ");
				}
			},
		});
	});

	it("safeSetCookie, safeGetCookie и safeDeleteCookie корректно сохраняют и читают куки", () => {
		safeSetCookie("test_cookie", "secret_value_123");
		assert.equal(safeGetCookie("test_cookie"), "secret_value_123");

		safeDeleteCookie("test_cookie");
		assert.equal(safeGetCookie("test_cookie"), null);
	});

	it("при записи DENTE_CLINIC_TOKEN_KEY токен попадает и в localStorage, и в document.cookie", () => {
		safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, "clinic-token-xyz-777", true);

		// Проверяем куку
		assert.equal(safeGetCookie(DENTE_CLINIC_TOKEN_KEY), "clinic-token-xyz-777");
		assert.equal(readDenteClinicToken(), "clinic-token-xyz-777");
	});

	it("если localStorage очистился (например, чистка кэша браузером), readDenteClinicToken восстанавливает токен из Cookie", () => {
		// Записываем токен
		safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, "resilient-clinic-token", true);
		assert.equal(safeGetCookie(DENTE_CLINIC_TOKEN_KEY), "resilient-clinic-token");

		// Очищаем in-memory и localStorage, но кука остается
		clearInMemoryStorageCache();
		resetInMemoryAuthTokens();
		if (typeof globalThis.localStorage !== "undefined") {
			globalThis.localStorage.removeItem(DENTE_CLINIC_TOKEN_KEY);
		}

		// readDenteClinicToken обязан восстановить токен из cookie!
		const recovered = readDenteClinicToken();
		assert.equal(recovered, "resilient-clinic-token");
	});

	it("если localStorage очистился, readDenteStaffToken восстанавливает токен сотрудника из Cookie", () => {
		safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, "resilient-staff-token", true);
		assert.equal(safeGetCookie(DENTE_STAFF_TOKEN_KEY), "resilient-staff-token");

		clearInMemoryStorageCache();
		resetInMemoryAuthTokens();
		if (typeof globalThis.localStorage !== "undefined") {
			globalThis.localStorage.removeItem(DENTE_STAFF_TOKEN_KEY);
		}

		const recovered = readDenteStaffToken();
		assert.equal(recovered, "resilient-staff-token");
	});

	it("при явном safeLocalStorageRemoveItem токен удаляется и из localStorage, и из cookies", () => {
		safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, "token-to-delete", true);
		assert.equal(safeGetCookie(DENTE_CLINIC_TOKEN_KEY), "token-to-delete");

		safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
		assert.equal(safeGetCookie(DENTE_CLINIC_TOKEN_KEY), null);
		assert.equal(readDenteClinicToken(), "");
	});
});
