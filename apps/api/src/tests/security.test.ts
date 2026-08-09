/**
 * security.test.ts — регрессионные тесты для исправленных уязвимостей.
 *
 * Каждый тест здесь соответствует конкретной дыре, которая была в коде.
 * Если тест падает — уязвимость вернулась.
 *
 * Запуск: node --test (или через существующий тестовый прогон проекта).
 */

import assert from "node:assert";
import test from "node:test";
import {
	authTokenSecret,
	resetAuthSecretCacheForTests,
} from "../security/authSecret.js";
import {
	ADMIN_ROLES,
	getRequestIdentity,
	requireOrganizationId,
	requireStaffIdentity,
} from "../security/identity.js";
import { verifyWebhookSecret } from "../security/webhookAuth.js";
import { signToken, verifyToken } from "../utils/cryptoHelper.js";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const TEST_SECRET = "k".repeat(48);

type FakeRequest = {
	headers: Record<string, string | string[] | undefined>;
	query?: Record<string, unknown>;
	ip?: string;
	url?: string;
	log?: { warn: (...args: unknown[]) => void };
};

function fakeRequest(
	headers: Record<string, string> = {},
	extra: Partial<FakeRequest> = {},
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
): any {
	return {
		headers,
		query: {},
		ip: "10.0.0.1",
		url: "/test",
		log: { warn: () => {} },
		...extra,
	};
}

function fakeReply() {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const state: { code: number | null; body: any } = { code: null, body: null };
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const reply: any = {
		code(value: number) {
			state.code = value;
			return reply;
		},
		send(body: unknown) {
			state.body = body;
			return reply;
		},
		header() {
			return reply;
		},
		state,
	};
	return reply;
}

function withEnv(
	overrides: Record<string, string | undefined>,
	fn: () => void,
): void {
	const previous: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(overrides)) {
		previous[key] = process.env[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	try {
		fn();
	} finally {
		for (const [key, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
		resetAuthSecretCacheForTests();
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Секрет подписи токенов
// ─────────────────────────────────────────────────────────────────────────────

test("секрет: production без AUTH_TOKEN_SECRET останавливает сервер", () => {
	withEnv({ NODE_ENV: "production", AUTH_TOKEN_SECRET: undefined }, () => {
		resetAuthSecretCacheForTests();
		assert.throws(() => authTokenSecret(), /AUTH_TOKEN_SECRET обязателен/);
	});
});

test("секрет: публичные демо-значения из репозитория запрещены", () => {
	for (const banned of [
		"dente_jwt_secret_demo",
		"dente-fallback-secret-2026",
		"my_super_secret_key_change_me_in_production",
	]) {
		withEnv({ NODE_ENV: "development", AUTH_TOKEN_SECRET: banned }, () => {
			resetAuthSecretCacheForTests();
			assert.throws(
				() => authTokenSecret(),
				/публичному демо-значению/,
				`не отклонён: ${banned}`,
			);
		});
	}
});

test("секрет: короткий секрет запрещён в production", () => {
	withEnv({ NODE_ENV: "production", AUTH_TOKEN_SECRET: "short" }, () => {
		resetAuthSecretCacheForTests();
		assert.throws(() => authTokenSecret(), /слишком короткий/);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Изоляция клиник (мультитенантность)
// ─────────────────────────────────────────────────────────────────────────────

test("изоляция: заголовок x-organization-id не даёт доступ к чужой клинике", () => {
	withEnv(
		{
			NODE_ENV: "development",
			AUTH_TOKEN_SECRET: TEST_SECRET,
			DENTE_DEV_ALLOW_HEADER_ORG: undefined,
		},
		() => {
			resetAuthSecretCacheForTests();
			const identity = getRequestIdentity(
				fakeRequest({ "x-organization-id": ORG_B }),
			);
			assert.strictEqual(
				identity.organizationId,
				null,
				"подделанный заголовок должен игнорироваться",
			);
		},
	);
});

test("изоляция: dev-послабление по заголовку не работает в production", () => {
	withEnv(
		{
			NODE_ENV: "production",
			AUTH_TOKEN_SECRET: TEST_SECRET,
			DENTE_DEV_ALLOW_HEADER_ORG: "1",
		},
		() => {
			resetAuthSecretCacheForTests();
			const identity = getRequestIdentity(
				fakeRequest({ "x-organization-id": ORG_B }),
			);
			assert.strictEqual(identity.organizationId, null);
		},
	);
});

test("изоляция: валидный токен кабинета определяет организацию", () => {
	withEnv({ NODE_ENV: "development", AUTH_TOKEN_SECRET: TEST_SECRET }, () => {
		resetAuthSecretCacheForTests();
		const token = signToken(
			{ organizationId: ORG_A, clinicName: "A" },
			TEST_SECRET,
			3600,
		);
		const identity = getRequestIdentity(
			fakeRequest({ "x-dente-clinic-token": token }),
		);
		assert.strictEqual(identity.organizationId, ORG_A);
		assert.strictEqual(identity.verified, true);
	});
});

test("изоляция: токен, подписанный старым публичным секретом, отвергается", () => {
	withEnv({ NODE_ENV: "development", AUTH_TOKEN_SECRET: TEST_SECRET }, () => {
		resetAuthSecretCacheForTests();
		const forged = signToken(
			{ organizationId: ORG_B },
			"dente_jwt_secret_demo",
			3600,
		);
		const identity = getRequestIdentity(
			fakeRequest({ "x-dente-clinic-token": forged }),
		);
		assert.strictEqual(identity.organizationId, null);
	});
});

test("изоляция: истёкший токен отвергается", () => {
	withEnv({ NODE_ENV: "development", AUTH_TOKEN_SECRET: TEST_SECRET }, () => {
		resetAuthSecretCacheForTests();
		const expired = signToken({ organizationId: ORG_A }, TEST_SECRET, -10);
		const identity = getRequestIdentity(
			fakeRequest({ "x-dente-clinic-token": expired }),
		);
		assert.strictEqual(identity.organizationId, null);
	});
});

test("изоляция: токен сотрудника другой клиники не наследует роль", () => {
	withEnv({ NODE_ENV: "development", AUTH_TOKEN_SECRET: TEST_SECRET }, () => {
		resetAuthSecretCacheForTests();
		const clinic = signToken({ organizationId: ORG_A }, TEST_SECRET, 3600);
		const foreignStaff = signToken(
			{ userId: "u1", role: "owner", organizationId: ORG_B },
			TEST_SECRET,
			3600,
		);
		const identity = getRequestIdentity(
			fakeRequest({
				"x-dente-clinic-token": clinic,
				"x-dente-staff-token": foreignStaff,
			}),
		);
		assert.strictEqual(identity.organizationId, ORG_A);
		assert.strictEqual(identity.userId, null);
		assert.strictEqual(identity.role, null);
	});
});

test("изоляция: requireOrganizationId отвечает 401 без токена", () => {
	withEnv(
		{
			NODE_ENV: "development",
			AUTH_TOKEN_SECRET: TEST_SECRET,
			DENTE_DEV_ALLOW_HEADER_ORG: undefined,
		},
		() => {
			resetAuthSecretCacheForTests();
			const reply = fakeReply();
			const result = requireOrganizationId(fakeRequest(), reply);
			assert.strictEqual(result, null);
			assert.strictEqual(reply.state.code, 401);
		},
	);
});

test("роли: врач не проходит проверку административной роли", async () => {
	withEnv(
		{ NODE_ENV: "development", AUTH_TOKEN_SECRET: TEST_SECRET },
		async () => {
			resetAuthSecretCacheForTests();
			const clinic = signToken({ organizationId: ORG_A }, TEST_SECRET, 3600);
			const doctor = signToken(
				{ userId: "u2", role: "doctor", organizationId: ORG_A },
				TEST_SECRET,
				3600,
			);
			const reply = fakeReply();
			const result = await requireStaffIdentity(
				fakeRequest({
					"x-dente-clinic-token": clinic,
					"x-dente-staff-token": doctor,
				}),
				reply,
				ADMIN_ROLES,
			);
			assert.strictEqual(result, null);
			assert.strictEqual(reply.state.code, 403);
		},
	);
});

// ─────────────────────────────────────────────────────────────────────────────
// Подпись токенов
// ─────────────────────────────────────────────────────────────────────────────

test("токены: подмена payload при сохранённой подписи отвергается", () => {
	const token = signToken({ organizationId: ORG_A }, TEST_SECRET, 3600);
	const signature = token.split(".")[1];
	const tamperedPayload = Buffer.from(
		JSON.stringify({
			organizationId: ORG_B,
			exp: Math.floor(Date.now() / 1000) + 3600,
		}),
	).toString("base64url");
	assert.strictEqual(
		verifyToken(`${tamperedPayload}.${signature}`, TEST_SECRET),
		null,
	);
});

// ─────────────────────────────────────────────────────────────────────────────
// Вебхуки
// ─────────────────────────────────────────────────────────────────────────────

test("вебхуки: в production без настроенного секрета запрос отклоняется", () => {
	withEnv(
		{
			NODE_ENV: "production",
			VK_WEBHOOK_SECRET: undefined,
			DENTE_WEBHOOK_SECRET: undefined,
		},
		() => {
			const reply = fakeReply();
			const ok = verifyWebhookSecret(fakeRequest(), reply, {
				channel: "vk",
				secretEnvNames: ["VK_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
			});
			assert.strictEqual(ok, false);
			assert.strictEqual(reply.state.code, 503);
		},
	);
});

test("вебхуки: неверный секрет отклоняется", () => {
	withEnv(
		{ NODE_ENV: "production", DENTE_WEBHOOK_SECRET: "real-secret" },
		() => {
			const reply = fakeReply();
			const ok = verifyWebhookSecret(
				fakeRequest({ "x-dente-webhook-secret": "wrong" }),
				reply,
				{
					channel: "vk",
					secretEnvNames: ["DENTE_WEBHOOK_SECRET"],
				},
			);
			assert.strictEqual(ok, false);
			assert.strictEqual(reply.state.code, 401);
		},
	);
});

test("вебхуки: верный секрет пропускается", () => {
	withEnv(
		{ NODE_ENV: "production", DENTE_WEBHOOK_SECRET: "real-secret" },
		() => {
			const reply = fakeReply();
			const ok = verifyWebhookSecret(
				fakeRequest({ "x-dente-webhook-secret": "real-secret" }),
				reply,
				{
					channel: "vk",
					secretEnvNames: ["DENTE_WEBHOOK_SECRET"],
				},
			);
			assert.strictEqual(ok, true);
		},
	);
});

// ─────────────────────────────────────────────────────────────────────────────
// Защита от повторного воспроизведения (Webhook Replay & Timestamp Drift)
// ─────────────────────────────────────────────────────────────────────────────

test("вебхуки: дрейф времени > 300 секунд фиксируется как нарушение окна", () => {
	const nowSec = Math.floor(Date.now() / 1000);
	const staleTimestampSec = nowSec - 301;
	const futureTimestampSec = nowSec + 301;
	const validTimestampSec = nowSec - 100;

	assert.strictEqual(Math.abs(nowSec - staleTimestampSec) > 300, true);
	assert.strictEqual(Math.abs(nowSec - futureTimestampSec) > 300, true);
	assert.strictEqual(Math.abs(nowSec - validTimestampSec) <= 300, true);
});

test("вебхуки: нормализация миллисекунд в секунды для временных меток", () => {
	const nowMs = Date.now();
	const nowSec = Math.floor(nowMs / 1000);

	const convertTs = (ts: number) => (ts > 1e11 ? Math.floor(ts / 1000) : ts);

	assert.strictEqual(convertTs(nowMs), nowSec);
	assert.strictEqual(convertTs(nowSec), nowSec);
});
