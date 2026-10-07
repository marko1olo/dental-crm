import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { organizations } from "../db/schema.js";
import { registerVkRoutes } from "../routes/vk.js";
import { resetAuthSecretCacheForTests } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";

const ORG_ID = fixtureUuid("vkCommunityAndAccount", 1);
const TEST_SECRET = "t".repeat(48);

describe("VK Integration: Community Bot, Personal Account & Webhook", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken: string;

	before(async () => {
		process.env.APP_SECRET = TEST_SECRET;
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG_ID, role: "admin" }, TEST_SECRET);

		app = Fastify();
		await registerVkRoutes(app);
		await app.ready();

		// Чистим и сеем организацию под правильным тенант-контекстом
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Тест ВК",
				inn: "7700000000",
			});
		});
	});

	after(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch {
			// ignore cleanup errors
		}
		await app.close();
		process.env = { ...originalEnv };
		resetAuthSecretCacheForTests();
	});

	test("GET /api/vk/bot/settings — возвращает параметры по умолчанию до подключения", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/vk/bot/settings",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.configured, false);
		assert.ok(body.secretKey, "secretKey должен быть сгенерирован автоматически");
		assert.ok(body.confirmationCode, "confirmationCode должен быть сгенерирован автоматически");
		assert.ok(body.webhookUrl.includes(`/api/public/${ORG_ID}/vk/webhook`), "webhookUrl содержит правильный путь");
	});

	test("POST /api/vk/bot/connect — подключает сообщество ВК с валидацией через Mock токен", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/vk/bot/connect",
			headers: {
				"content-type": "application/json",
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
			payload: {
				groupId: "220000123",
				groupToken: "mock_vk_group_token_for_test",
				secretKey: "test_secret_key_123",
				confirmationCode: "confirm77",
				isEnabled: true,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.ok, true);
		assert.equal(body.group.id, 220000123);
		assert.equal(body.secretKey, "test_secret_key_123");
		assert.equal(body.confirmationCode, "confirm77");
	});

	test("POST /api/vk/bot/verify — проверяет активное подключение сообщества из БД", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/vk/bot/verify",
			headers: {
				"content-type": "application/json",
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
			payload: {},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.ok, true);
		assert.equal(body.group.id, 220000123);
	});

	test("GET /api/vk/account/status — до подключения аккаунта возвращает connected: false", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/vk/account/status",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.connected, false);
		assert.equal(body.account, null);
	});

	test("POST /api/vk/account/connect — подключает личную страницу врача с профилем", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/vk/account/connect",
			headers: {
				"content-type": "application/json",
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
			payload: {
				accessToken: "mock_vk_user_token_secret_123",
				vkUserId: "77889900",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.ok, true);
		assert.equal(body.profile.id, 77889900);
		assert.ok(body.profile.first_name, "Профиль содержит имя пользователя");
	});

	test("GET /api/vk/account/status — после подключения возвращает данные профиля", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/vk/account/status",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.connected, true);
		assert.equal(body.account.vkUserId, "77889900");
		assert.equal(body.account.status, "connected");
		assert.ok(body.account.firstName);
	});

	test("POST /api/vk/account/disconnect — отключает личный аккаунт", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/vk/account/disconnect",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.ok, true);

		// Проверка статуса
		const statusRes = await app.inject({
			method: "GET",
			url: "/api/vk/account/status",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});
		assert.equal(JSON.parse(statusRes.body).connected, false);
	});

	test("POST /api/public/:organizationId/vk/webhook — проверка confirmation с сохранением secretKey", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/public/${ORG_ID}/vk/webhook`,
			headers: {
				"content-type": "application/json",
				"x-vk-secret": "test_secret_key_123",
			},
			payload: {
				type: "confirmation",
				group_id: 220000123,
				secret: "test_secret_key_123",
			},
		});

		assert.equal(res.statusCode, 200);
		assert.equal(res.body, "confirm77", "Должен вернуть confirmationCode из базы");
	});

	test("POST /api/public/:organizationId/vk/webhook — отклоняет запрос с неверным секретом", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/public/${ORG_ID}/vk/webhook`,
			headers: {
				"content-type": "application/json",
			},
			payload: {
				type: "confirmation",
				group_id: 220000123,
				secret: "wrong_secret_attack",
			},
		});

		assert.equal(res.statusCode, 403);
	});
});
