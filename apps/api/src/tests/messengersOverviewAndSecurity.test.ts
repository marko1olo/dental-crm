import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	denteMaxBotConfigs,
	denteTelegramBotConfigs,
	denteVkBotConfigs,
	denteWhatsappBotConfigs,
	organizations,
} from "../db/schema.js";
import { registerOmnichannelBotRoutes } from "../routes/omnichannelBots.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	BotTokenVaultAuthenticationError,
	BotTokenVaultError,
	OmnichannelTokenVault,
} from "../services/bots/OmnichannelTokenVault.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerRouteNotFoundHandler } from "../utils/routeNotFound.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "msgOverviewTest";
const ORG_A = fixtureUuid(NAMESPACE, 1);
const ORG_B = fixtureUuid(NAMESPACE, 2);

describe("Omnichannel Messengers Overview & Token Security Master Hub", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicTokenA = "";
	let databaseReady = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_A, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_A,
					name: "Клиника Омни ХАБ Тест A",
				})
				.onConflictDoNothing();

			// Seed sample configs
			await db
				.insert(denteTelegramBotConfigs)
				.values({
					organizationId: ORG_A,
					botConfigId: "default",
					mode: "clinic_owned_bot",
					botUsername: "DenteTestBot",
					tokenSecretRef: OmnichannelTokenVault.encrypt("123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ", ORG_A),
					isActive: true,
				})
				.onConflictDoNothing();

			await db
				.insert(denteWhatsappBotConfigs)
				.values({
					organizationId: ORG_A,
					provider: "cloud_api",
					phoneNumberId: "10987654321",
					wabaAccountId: "9876543210",
					accessToken: OmnichannelTokenVault.encrypt("EAABwzL1234567890MetaTokenSecret", ORG_A),
					isActive: true,
					isEnabled: true,
				})
				.onConflictDoNothing();
		});

		await withFixtureTenant(ORG_B, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_B,
					name: "Клиника Омни ХАБ Тест B",
				})
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		clinicTokenA = signToken({ organizationId: ORG_A }, secret);

		app = createTenantTestApp();
		registerRouteNotFoundHandler(app);
		await registerOmnichannelBotRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
	});

	// =========================================================================
	// 1. VAULT CRYPTOGRAPHY & TENANT ISOLATION INVARIANTS
	// =========================================================================
	test("VAULT: AES-256-GCM encryption with tenant AAD and isolation", () => {
		const rawSecret = "vk1.a.secretGroupToken99999";
		const encrypted = OmnichannelTokenVault.encrypt(rawSecret, ORG_A);

		assert.ok(encrypted.startsWith("enc:v1:"), "Должен иметь версионный префикс enc:v1:");
		assert.ok(!encrypted.includes(rawSecret), "Зашифрованная строка не должна содержать открытый токен");

		// Успешная дешифрация для той же организации
		const decrypted = OmnichannelTokenVault.decrypt(encrypted, ORG_A);
		assert.equal(decrypted, rawSecret, "Расшифрованный токен должен совпадать с исходным");

		// КРИТИЧЕСКИЙ ТЕСТ: попытка дешифровать чужой организацией обязана выбрасывать BotTokenVaultAuthenticationError
		assert.throws(
			() => {
				OmnichannelTokenVault.decrypt(encrypted, ORG_B);
			},
			(err: any) => err instanceof BotTokenVaultAuthenticationError,
			"Дешифрация под чужой организацией ORG_B должна падать с AuthTag mismatch",
		);
	});

	test("VAULT: Token masking protects sensitive credentials from leaking to UI", () => {
		const rawToken = "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ";
		const masked = OmnichannelTokenVault.maskToken(rawToken);
		assert.ok(masked.includes("****"), "Маскированный токен должен содержать ****");
		assert.ok(!masked.includes("ABCdef"), "Маскированный токен не должен раскрывать секретную часть");

		const encToken = OmnichannelTokenVault.encrypt(rawToken, ORG_A);
		const maskedEnc = OmnichannelTokenVault.maskToken(encToken);
		assert.equal(maskedEnc, "enc:v1:****...", "Зашифрованный токен должен маскироваться как enc:v1:****...");

		// Пустые значения
		assert.equal(OmnichannelTokenVault.maskToken(""), "");
		assert.equal(OmnichannelTokenVault.maskToken(null), "");
	});

	// =========================================================================
	// 2. FASTIFY API: GET /api/messengers/overview
	// =========================================================================
	test("API: GET /api/messengers/overview returns all 6 channels with valid statuses", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/messengers/overview",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
			},
		});

		assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);

		assert.ok(body.summary, "Ответ должен содержать summary");
		assert.equal(typeof body.summary.total, "number");
		assert.ok(body.summary.total >= 6, "Всего должно быть не менее 6 каналов");
		assert.ok(Array.isArray(body.channels), "Ответ должен содержать массив channels");

		// Проверяем наличие всех 6 обязательных каналов
		const expectedIds = ["tg_bot", "tg_account", "vk_group", "vk_account", "wa_phone", "wa_waba"];
		for (const id of expectedIds) {
			const found = body.channels.find((c: any) => c.id === id);
			assert.ok(found, `Канал ${id} должен присутствовать в overview`);
			assert.ok(
				["connected", "pending_qr", "unconfigured"].includes(found.status),
				`Недопустимый статус у канала ${id}: ${found.status}`,
			);
			assert.ok(found.title, `У канала ${id} должен быть title`);
			assert.ok(found.shortBadge, `У канала ${id} должен быть shortBadge`);

			// Проверка маскирования: ни один токен не должен содержать открытых длинных секретов
			if (found.tokenMasked) {
				assert.ok(
					found.tokenMasked.includes("****"),
					`Токен у ${id} не замаскирован: ${found.tokenMasked}`,
				);
			}
		}

		// TG Bot был засеян -> должен быть connected
		const tgBot = body.channels.find((c: any) => c.id === "tg_bot");
		assert.equal(tgBot.status, "connected", "TG Bot должен иметь статус connected");
		assert.equal(tgBot.statusColor, "green");

		// WA WABA был засеян -> должен быть connected
		const waWaba = body.channels.find((c: any) => c.id === "wa_waba");
		assert.equal(waWaba.status, "connected", "WA WABA должен иметь статус connected");
		assert.equal(waWaba.statusColor, "green");
	});

	// =========================================================================
	// 3. FASTIFY API: POST /api/messengers/test-connection
	// =========================================================================
	test("API: POST /api/messengers/test-connection checks channel readiness", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Проверка подключенного канала
		const resConnected = await app.inject({
			method: "POST",
			url: "/api/messengers/test-connection",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
			},
			payload: {
				channelId: "tg_bot",
			},
		});

		assert.equal(resConnected.statusCode, 200);
		const bodyConn = JSON.parse(resConnected.body);
		assert.equal(bodyConn.ok, true);
		assert.equal(bodyConn.status, "connected");
		assert.ok(bodyConn.latencyMs > 0, "Должен возвращать пинг/задержку");
		assert.ok(bodyConn.message.includes("стабильна"));

		// Проверка неподключенного канала
		const resUnconf = await app.inject({
			method: "POST",
			url: "/api/messengers/test-connection",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
			},
			payload: {
				channelId: "vk_account",
			},
		});

		assert.equal(resUnconf.statusCode, 200);
		const bodyUnconf = JSON.parse(resUnconf.body);
		assert.equal(bodyUnconf.ok, false);
		assert.equal(bodyUnconf.status, "unconfigured");
		assert.ok(bodyUnconf.message.includes("еще не настроен"));

		// Некорректный запрос без channelId
		const resInvalid = await app.inject({
			method: "POST",
			url: "/api/messengers/test-connection",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
			},
			payload: {},
		});

		assert.equal(resInvalid.statusCode, 400);
	});
});
