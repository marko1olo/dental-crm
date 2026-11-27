/**
 * apiAuthFetch.test.ts — проверка подстановки токенов в запросы к API.
 *
 * Важно, что покрыто:
 *  - токен уходит в собственный /api/ (иначе сервер вернёт 401 и приложение "ослепнет");
 *  - токен НЕ уходит на сторонние домены и в публичные маршруты (утечка сессии);
 *  - запросы вне /api/ не трогаются.
 *
 * Стиль тестов — node:test, как в остальном проекте (vitest не подключён).
 */

import assert from "node:assert";
import { before, describe, it } from "node:test";

// Модуль читает window.location.origin, поэтому в Node нужен минимальный стенд.
before(() => {
	const existingWin = (globalThis as { window?: Record<string, unknown> }).window;
	if (!existingWin) {
		(globalThis as { window?: Record<string, unknown> }).window = {
			location: { origin: "https://crm.example.ru" },
			localStorage: { getItem: () => null, setItem: () => {} },
			addEventListener: () => {},
			removeEventListener: () => {},
		};
	} else {
		if (!existingWin.addEventListener) existingWin.addEventListener = () => {};
		if (!existingWin.removeEventListener) existingWin.removeEventListener = () => {};
	}
});

describe("shouldAttachApiAuth", () => {
	it("подставляет токен в защищённые маршруты собственного API", async () => {
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		assert.strictEqual(shouldAttachApiAuth("/api/patients"), true);
		assert.strictEqual(shouldAttachApiAuth("/api/settings/clinic"), true);
		assert.strictEqual(
			shouldAttachApiAuth("https://crm.example.ru/api/dashboard"),
			true,
		);
	});

	it("не подставляет токен в публичные маршруты", async () => {
		// Публичная запись на приём, портал пациента и сам вход не требуют сессии,
		// а утечка туда токена персонала расширила бы поверхность атаки.
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		assert.strictEqual(
			shouldAttachApiAuth("/api/public/org-id/vk/webhook"),
			false,
		);
		assert.strictEqual(shouldAttachApiAuth("/api/portal/me"), false);
		assert.strictEqual(shouldAttachApiAuth("/api/auth/clinic/login"), false);
	});

	it("никогда не отправляет токен на сторонний домен", async () => {
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		assert.strictEqual(
			shouldAttachApiAuth("https://evil.example.com/api/patients"),
			false,
		);
		assert.strictEqual(
			shouldAttachApiAuth("https://api.groq.com/openai/v1/chat"),
			false,
		);
	});

	it("игнорирует запросы вне /api/", async () => {
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		assert.strictEqual(shouldAttachApiAuth("/assets/index.js"), false);
		assert.strictEqual(shouldAttachApiAuth("/"), false);
	});
});

describe("installApiAuthFetch idempotency guard", () => {
	it("генерирует валидный UUID и не копирует невалидный clientMutationId в X-Idempotency-Key", async () => {
		const uuidPattern =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const capturedHeaders: Headers[] = [];
		const win = (globalThis as { window: Record<string, unknown> }).window;
		const prevFetch = win.fetch;
		delete win.__denteApiAuthFetchInstalled;
		win.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
			capturedHeaders.push(new Headers(init?.headers));
			return new Response("{}", { status: 200 });
		};

		try {
			const { installApiAuthFetch } = await import("../lib/apiAuthFetch.js");
			installApiAuthFetch();

			const wrappedFetch = win.fetch as typeof fetch;
			await wrappedFetch("/api/cashbox/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clientMutationId: "payment-legacy-non-uuid" }),
			});

			const first = capturedHeaders[0];
			assert.ok(first, "fetch должен перехватить заголовки");
			assert.match(first.get("X-Idempotency-Key") ?? "", uuidPattern);
			assert.match(first.get("Idempotency-Key") ?? "", uuidPattern);
			assert.notStrictEqual(
				first.get("X-Idempotency-Key"),
				"payment-legacy-non-uuid",
			);

			const validUuid = "0194f3a1-1234-7abc-8def-0123456789ab";
			await wrappedFetch("/api/cashbox/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clientMutationId: validUuid }),
			});
			const second = capturedHeaders[1];
			assert.strictEqual(second?.get("X-Idempotency-Key"), validUuid);
		} finally {
			delete win.__denteApiAuthFetchInstalled;
			win.fetch = prevFetch;
		}
	});
});

describe("installApiAuthFetch Bearer priority & Capacitor LAN WebView rewrite", () => {
	it("ставит Bearer staffToken в приоритете над clinicToken и перенаправляет /api/* на LAN-сервер в Capacitor", async () => {
		const calls: Array<{ url: string; headers: Headers }> = [];
		const store = new Map<string, string>();
		const win = (globalThis as { window: Record<string, unknown> }).window;
		const prevFetch = win.fetch;
		const prevLocation = win.location;
		const prevLocalStorage = win.localStorage;
		const prevCapacitor = win.Capacitor;

		win.location = {
			origin: "https://localhost",
			protocol: "https:",
			hostname: "localhost",
			search: "",
		};
		win.Capacitor = { isNativePlatform: () => true };
		win.localStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => {
				store.set(k, v);
			},
			removeItem: (k: string) => {
				store.delete(k);
			},
		};
		store.set("dente_lan_server_url", "http://192.168.1.50:4100");
		store.set("dente_clinic_token", "clinic-tok-1");
		store.set("dente_staff_token", "staff-tok-2");

		delete win.__denteApiAuthFetchInstalled;
		win.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
			const hdrs = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
			calls.push({ url, headers: hdrs });
			return new Response("{}", { status: 200 });
		};

		try {
			const { installApiAuthFetch, syncAuthTokensFromStorage, clearCachedAuthTokens } = await import(
				"../lib/apiAuthFetch.js"
			);
			const {
				clearInMemoryStorageCache,
				safeLocalStorageRemoveItem,
				safeLocalStorageSetItem,
			} = await import("../lib/safeLocalStorage.js");

			clearInMemoryStorageCache();
			safeLocalStorageSetItem("dente_lan_server_url", "http://192.168.1.50:4100", true);
			safeLocalStorageSetItem("dente_clinic_token", "clinic-tok-1", true);
			safeLocalStorageSetItem("dente_staff_token", "staff-tok-2", true);
			syncAuthTokensFromStorage();
			installApiAuthFetch();
			const wrappedFetch = win.fetch as typeof fetch;

			// 1. В Capacitor WebView относительный /api/* уходит на paired LAN-сервер с Bearer = staffToken
			await wrappedFetch("/api/patients?limit=20", { method: "GET" });
			assert.strictEqual(calls.length, 1);
			assert.strictEqual(calls[0]?.url, "http://192.168.1.50:4100/api/patients?limit=20");
			assert.strictEqual(calls[0]?.headers.get("Authorization"), "Bearer staff-tok-2");
			assert.strictEqual(calls[0]?.headers.get("x-dente-staff-token"), "staff-tok-2");
			assert.strictEqual(calls[0]?.headers.get("x-dente-clinic-token"), "clinic-tok-1");

			// 2. Без staffToken fallback в Bearer на clinicToken
			safeLocalStorageRemoveItem("dente_staff_token");
			syncAuthTokensFromStorage();
			await wrappedFetch("/api/settings/clinic", { method: "GET" });
			assert.strictEqual(calls[1]?.headers.get("Authorization"), "Bearer clinic-tok-1");

			// 3. Сторонний домен никогда не получает токены
			await wrappedFetch("https://evil.example.com/api/patients", { method: "GET" });
			assert.strictEqual(calls[2]?.url, "https://evil.example.com/api/patients");
			assert.strictEqual(calls[2]?.headers.get("Authorization"), null);
			assert.strictEqual(calls[2]?.headers.get("x-dente-staff-token"), null);

			clearCachedAuthTokens();
			safeLocalStorageRemoveItem("dente_lan_server_url");
			clearInMemoryStorageCache();
		} finally {
			delete win.__denteApiAuthFetchInstalled;
			win.fetch = prevFetch;
			win.location = prevLocation;
			win.localStorage = prevLocalStorage;
			win.Capacitor = prevCapacitor;
		}
	});
});
