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
