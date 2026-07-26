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

import { describe, it, before } from "node:test";
import assert from "node:assert";

// Модуль читает window.location.origin, поэтому в Node нужен минимальный стенд.
before(() => {
	if (typeof (globalThis as { window?: unknown }).window === "undefined") {
		(globalThis as { window?: unknown }).window = {
			location: { origin: "https://crm.example.ru" },
			localStorage: { getItem: () => null, setItem: () => {} },
		};
	}
});

describe("shouldAttachApiAuth", () => {
	it("подставляет токен в защищённые маршруты собственного API", async () => {
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		assert.strictEqual(shouldAttachApiAuth("/api/patients"), true);
		assert.strictEqual(shouldAttachApiAuth("/api/settings/clinic"), true);
		assert.strictEqual(shouldAttachApiAuth("https://crm.example.ru/api/dashboard"), true);
	});

	it("не подставляет токен в публичные маршруты", async () => {
		// Публичная запись на приём, портал пациента и сам вход не требуют сессии,
		// а утечка туда токена персонала расширила бы поверхность атаки.
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		assert.strictEqual(shouldAttachApiAuth("/api/public/org-id/vk/webhook"), false);
		assert.strictEqual(shouldAttachApiAuth("/api/portal/me"), false);
		assert.strictEqual(shouldAttachApiAuth("/api/auth/clinic/login"), false);
	});

	it("никогда не отправляет токен на сторонний домен", async () => {
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		assert.strictEqual(shouldAttachApiAuth("https://evil.example.com/api/patients"), false);
		assert.strictEqual(shouldAttachApiAuth("https://api.groq.com/openai/v1/chat"), false);
	});

	it("игнорирует запросы вне /api/", async () => {
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		assert.strictEqual(shouldAttachApiAuth("/assets/index.js"), false);
		assert.strictEqual(shouldAttachApiAuth("/"), false);
	});
});
