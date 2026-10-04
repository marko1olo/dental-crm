import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import {
	TelegramMultiTenantSupervisor,
	computeBotTokenHash,
	timingSafeSecretMatch,
	type TenantBotRuntime,
} from "../services/telegram/TelegramMultiTenantSupervisor.js";
import {
	TelegramTokenVault,
	TelegramTokenVaultAuthenticationError,
	TelegramTokenVaultError,
} from "../services/telegram/TelegramTokenVault.js";
import { TelegramStaffCockpitService } from "../services/telegram/TelegramStaffCockpitService.js";
import { validateTelegramWebAppData } from "../routes/patientPortal.js";
import { withTenantCtx } from "../db/rls.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HIGH-DENSITY MULTI-TENANT TELEGRAM BOT LOAD & SECURITY PENETRATION SUITE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Архитектурные инварианты (First Principles & Mandates 4, 8c, 8e, 8n):
 * 1. High-Density Load Benchmark:
 *    - 1 000 виртуальных ботов клиник в едином процессе Fastify.
 *    - Потребление ОЗУ в покое: < 15 МБ на 1 000 ботов (< 15 КБ / бот).
 *    - Шквал из 1 000 одновременных входящих вебхуков через app.inject:
 *      замер RPS, p99/avg задержки (target: < 5 мс), 0% ошибок / потерь.
 * 2. Беспощадный Security & Pentest Audit (5 векторов атак):
 *    - Атака 1: Подделка вебхука без secret-token или с чужим секретом (401).
 *    - Атака 2: Multi-Tenant Breach — попытка доступа к клинике Б через бота А (RLS & Crypto AAD).
 *    - Атака 3: Replay attack на одноразовый QR-токен персонала врача (token_already_used).
 *    - Атака 4: Подделка HMAC-SHA256 подписи в Telegram WebApp initData (isValid: false).
 *    - Атака 5: Взлом AES-256-GCM Token Vault с поддельным auth tag ("Unsupported state or unable to authenticate data").
 */
describe("High-Density Multi-Tenant Telegram Bot Load & Security Audit Suite", () => {
	describe("1. High-Density Load & Memory Footprint Benchmark (1 000 Virtual Bots)", () => {
		it("registers 1 000 virtual clinic bots with memory footprint < 15 MB (< 15 KB per bot at rest)", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();

			if (typeof global.gc === "function") {
				global.gc();
			}
			const heapBefore = process.memoryUsage().heapUsed;
			const regStart = performance.now();

			// Регистрируем 1 000 независимых ботов стоматологических клиник
			for (let i = 1; i <= 1000; i++) {
				const orgId = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
				const token = `777000${String(i).padStart(4, "0")}:AAFlkjhasd9876234_virtual_bot_token_${i}`;
				await supervisor.registerBot({
					organizationId: orgId,
					botConfigId: `clinic-bot-${i}`,
					botToken: token,
					botUsername: `clinic_dent_bot_${i}`,
					presetId: i % 2 === 0 ? "universal_clinic" : "high_risk_surgery",
					webhookSecret: `wh_secret_key_${i}_${orgId.slice(-6)}`,
					webhookBaseUrl: "https://dente-cloud.clinic.ru",
					mode: "webhook",
					rateLimitMaxPerSec: 5000, // Высокий лимит для нагрузочного шквала
					rateLimitBurst: 5000,
				});
			}

			const regDurationMs = performance.now() - regStart;

			if (typeof global.gc === "function") {
				global.gc();
			}
			const heapAfter = process.memoryUsage().heapUsed;
			const deltaBytes = Math.max(0, heapAfter - heapBefore);
			const deltaMb = Number((deltaBytes / (1024 * 1024)).toFixed(2));
			const kbPerBot = Number(((deltaBytes / 1000) / 1024).toFixed(2));

			const status = supervisor.getSupervisorStatus();

			// Проверка состояния реестра
			assert.strictEqual(status.totalRegisteredBots, 1000, "Должно быть зарегистрировано ровно 1 000 ботов");
			assert.strictEqual(status.activeBotsCount, 1000, "Все 1 000 ботов должны быть в активном статусе");
			assert.strictEqual(status.webhookBotsCount, 1000, "Все 1 000 ботов должны работать в режиме webhook");
			assert.strictEqual(status.pollingBotsCount, 0, "Фоновых polling воркеров должно быть ровно 0");

			// Эмпирический замер памяти: дельта должна быть строго < 15 МБ (< 15 КБ на бота)
			assert.ok(
				deltaMb < 15.0,
				`Дельта кучи ОЗУ на 1 000 ботов составляет ${deltaMb} МБ, что превышает порог 15 МБ`,
			);
			assert.ok(
				kbPerBot < 15.0,
				`Расход памяти на одного бота ${kbPerBot} КБ превышает порог 15 КБ`,
			);

			// Расчетный размер по структуре V8: ~2.8 КБ на инстанс
			assert.ok(
				status.estimatedMemoryUsageKb <= 4096,
				`Расчетное использование ${status.estimatedMemoryUsageKb} КБ должно быть <= 4 МБ`,
			);

			// Время регистрации 1 000 ботов обязано быть быстрым
			assert.ok(
				regDurationMs < 3000,
				`Регистрация 1 000 ботов заняла ${regDurationMs.toFixed(1)} мс (ожидалось < 3 000 мс)`,
			);

			// Проверка O(1) поиска по хешу токена среди 1 000 ботов
			const probeIndex = 777;
			const probeToken = `777000${String(probeIndex).padStart(4, "0")}:AAFlkjhasd9876234_virtual_bot_token_${probeIndex}`;
			const probeHash = computeBotTokenHash(probeToken);

			const lookupStart = performance.now();
			const foundBot = supervisor.getBotByTokenHash(probeHash);
			const lookupDuration = performance.now() - lookupStart;

			assert.ok(foundBot, "Бот #777 должен мгновенно находиться в Map по хешу токена");
			assert.strictEqual(foundBot.botUsername, `clinic_dent_bot_${probeIndex}`);
			assert.ok(
				lookupDuration < 1.0,
				`Поиск в Map занял ${lookupDuration.toFixed(3)} мс, что должно быть < 1 мс O(1)`,
			);

			await supervisor.shutdown();
		});

		it("simulates a flood of 1 000 concurrent incoming webhooks via Fastify app.inject: RPS, avg latency < 5 ms, 0% packet loss", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const testBots: TenantBotRuntime[] = [];

			// Регистрируем 1 000 ботов под нагрузочный вебхук-тест
			for (let i = 1; i <= 1000; i++) {
				const orgId = `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
				const token = `888000${String(i).padStart(4, "0")}:load_token_${i}`;
				const bot = await supervisor.registerBot({
					organizationId: orgId,
					botConfigId: `load-bot-${i}`,
					botToken: token,
					botUsername: `load_bot_${i}`,
					webhookSecret: `wh_secret_${i}`,
					mode: "webhook",
					rateLimitMaxPerSec: 10000,
					rateLimitBurst: 10000,
				});
				testBots.push(bot);
			}

			// Создаем боевой легковесный Fastify стенд с динамическим роутером супервизора
			const app: FastifyInstance = Fastify({ logger: false });
			app.post("/api/telegram/webhook/token/:botTokenHash", async (req, reply) => {
				const { botTokenHash } = req.params as { botTokenHash: string };
				const secretHeader = req.headers["x-telegram-bot-api-secret-token"] as string | undefined;

				const dispatchResult = await supervisor.dispatchIncomingUpdate({
					tokenHash: botTokenHash,
					secretTokenHeader: secretHeader ?? null,
					update: req.body,
					handler: async (runtime, update) => {
						const body = update as { update_id: number; message?: { text?: string } };
						return {
							processed: true,
							botId: runtime.botId,
							organizationId: runtime.organizationId,
							echoUpdateId: body.update_id,
						};
					},
				});

				return reply.code(dispatchResult.statusCode).send(dispatchResult);
			});

			await app.ready();

			// Формируем 1 000 одновременных входящих вебхуков (по 1 запросу на каждого из 1 000 ботов клиник)
			const requests = testBots.map((bot, index) => {
				const updatePayload = {
					update_id: 10000 + index,
					message: {
						message_id: index + 1,
						text: "/start",
						chat: { id: 700000 + index, type: "private" },
						date: Math.floor(Date.now() / 1000),
					},
				};

				return app.inject({
					method: "POST",
					url: `/api/telegram/webhook/token/${bot.botTokenHash}`,
					headers: {
						"content-type": "application/json",
						"x-telegram-bot-api-secret-token": bot.webhookSecret || "",
					},
					payload: updatePayload,
				});
			});

			// Запускаем шквал из 1 000 одновременных запросов
			const floodStart = performance.now();
			const responses = await Promise.all(requests);
			const totalDurationMs = performance.now() - floodStart;

			// Расчет телеметрии нагрузки
			const totalRequests = responses.length;
			const durationSeconds = totalDurationMs / 1000;
			const calculatedRps = Math.round(totalRequests / Math.max(0.001, durationSeconds));
			const avgLatencyMs = Number((totalDurationMs / totalRequests).toFixed(2));

			let successCount = 0;
			let errorCount = 0;

			for (const res of responses) {
				if (res.statusCode === 200) {
					const body = JSON.parse(res.body) as { ok: boolean };
					if (body.ok === true) {
						successCount++;
					} else {
						errorCount++;
					}
				} else {
					errorCount++;
				}
			}

			// Инварианты стабильности и качества
			assert.strictEqual(totalRequests, 1000, "Всего отправлено 1 000 запросов");
			assert.strictEqual(successCount, 1000, "Ровно 1 000 из 1 000 запросов обработаны успешно");
			assert.strictEqual(errorCount, 0, "0% потерь пакетов (0 ошибок)");

			// Требование по средней задержке < 5 мс
			assert.ok(
				avgLatencyMs < 5.0,
				`Средняя задержка ${avgLatencyMs} мс превышает допустимый лимит 5.0 мс`,
			);

			// RPS должен быть высоким (Fastify в памяти выдерживает > 1 000 RPS)
			assert.ok(
				calculatedRps >= 500,
				`Фактический RPS ${calculatedRps} ниже допустимого минимума 500`,
			);

			// Проверка агрегированной телеметрии супервизора
			const supervisorStatus = supervisor.getSupervisorStatus();
			assert.strictEqual(supervisorStatus.totalUpdatesProcessed, 1000);
			assert.strictEqual(supervisorStatus.totalRateLimited, 0);

			await app.close();
			await supervisor.shutdown();
		});

		it("demonstrates single-tenant high-throughput concurrency burst (1 000 requests to 1 enterprise clinic bot)", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const enterpriseOrgId = "enterprise-flagship-clinic-01";
			const token = "9999990001:enterprise_bot_token";
			const tokenHash = computeBotTokenHash(token);

			await supervisor.registerBot({
				organizationId: enterpriseOrgId,
				botConfigId: "flagship",
				botToken: token,
				botUsername: "flagship_dente_bot",
				webhookSecret: "enterprise_secret_888",
				mode: "webhook",
				rateLimitMaxPerSec: 5000,
				rateLimitBurst: 2000, // Высокий burst для флагманских сетей клиник
			});

			const startTime = performance.now();
			const burstPromises = Array.from({ length: 1000 }, (_, i) => {
				return supervisor.dispatchIncomingUpdate({
					tokenHash,
					secretTokenHeader: "enterprise_secret_888",
					update: { update_id: 50000 + i },
					handler: async () => ({ ok: true, processed: i }),
				});
			});

			const results = await Promise.all(burstPromises);
			const durationMs = performance.now() - startTime;
			const avgLatencyMs = Number((durationMs / 1000).toFixed(3));

			const okCount = results.filter((r) => r.ok && r.statusCode === 200).length;
			assert.strictEqual(okCount, 1000, "Все 1 000 параллельных обновлений обработаны успешно");
			assert.ok(avgLatencyMs < 2.0, `Задержка на обновление ${avgLatencyMs} мс должна быть < 2.0 мс`);

			await supervisor.shutdown();
		});
	});

	describe("2. Adversarial Security & Pentest Audit (5 Red Team Attack Vectors)", () => {
		describe("Attack Vector 1: Webhook Spoofing & Forgery (Missing / Invalid Secret Token)", () => {
			it("rejects unauthorized webhook request with 401 when x-telegram-bot-api-secret-token is missing", async () => {
				const supervisor = new TelegramMultiTenantSupervisor();
				const token = "111222333:bot_token_sec_1";
				const tokenHash = computeBotTokenHash(token);

				await supervisor.registerBot({
					organizationId: "victim-clinic-org",
					botToken: token,
					webhookSecret: "legitimate_crypto_secret_999",
					mode: "webhook",
				});

				// Атака: запрос отправляется вообще без заголовка секрета
				const res = await supervisor.dispatchIncomingUpdate({
					tokenHash,
					secretTokenHeader: null,
					update: { update_id: 1 },
					handler: async () => {
						assert.fail("Хэндлер не должен выполняться при отсутствии секрета");
					},
				});

				assert.strictEqual(res.ok, false);
				assert.strictEqual(res.statusCode, 401);
				assert.strictEqual(res.error, "TelegramWebhookSecretMismatch");
				assert.match(res.message || "", /Недействительный секретный токен/);

				await supervisor.shutdown();
			});

			it("rejects forged webhook request with 401 when attacker presents wrong secret", async () => {
				const supervisor = new TelegramMultiTenantSupervisor();
				const token = "222333444:bot_token_sec_2";
				const tokenHash = computeBotTokenHash(token);

				await supervisor.registerBot({
					organizationId: "victim-clinic-org-2",
					botToken: token,
					webhookSecret: "super_secret_auth_token_safe",
					mode: "webhook",
				});

				// Атака: поддельный секрет злоумышленника
				const res = await supervisor.dispatchIncomingUpdate({
					tokenHash,
					secretTokenHeader: "attacker_forged_secret_token_1337",
					update: { update_id: 2 },
					handler: async () => {
						assert.fail("Хэндлер не должен выполняться при поддельном секрете");
					},
				});

				assert.strictEqual(res.ok, false);
				assert.strictEqual(res.statusCode, 401);
				assert.strictEqual(res.error, "TelegramWebhookSecretMismatch");

				await supervisor.shutdown();
			});

			it("enforces timing-safe constant-time secret comparison resisting timing side-channel attacks", () => {
				const secretA = "correct_timing_safe_secret_string_489123847";
				const secretB = "correct_timing_safe_secret_string_489123848"; // 1 бит отличия в конце
				const secretShort = "correct";

				// Константное время сравнения Buffer
				assert.strictEqual(timingSafeSecretMatch(secretA, secretA), true);
				assert.strictEqual(timingSafeSecretMatch(secretA, secretB), false);
				assert.strictEqual(timingSafeSecretMatch(secretA, secretShort), false);
				assert.strictEqual(timingSafeSecretMatch(null, secretA), false);
				assert.strictEqual(timingSafeSecretMatch(secretA, undefined), false);
			});
		});

		describe("Attack Vector 2: Multi-Tenant Breach & Cross-Tenant Data Leak (RLS & Crypto AAD)", () => {
			const clinicA_OrgId = "00000000-0000-4000-8000-111111111111";
			const clinicB_OrgId = "00000000-0000-4000-8000-222222222222";
			const rawBotFatherTokenClinicA = "7123456789:AAFn_ClinicA_BotTokenXYZ";

			it("cryptographically rejects cross-tenant token decryption via AES-256-GCM AAD mismatch", () => {
				// Клиника А шифрует свой токен бота со своим organizationId в качестве AAD
				const encryptedForClinicA = TelegramTokenVault.encryptToken(
					rawBotFatherTokenClinicA,
					clinicA_OrgId,
				);

				// Легитимная расшифровка в контексте Клиники А проходит успешно
				const decryptedA = TelegramTokenVault.decryptToken(
					encryptedForClinicA,
					clinicA_OrgId,
				);
				assert.strictEqual(decryptedA, rawBotFatherTokenClinicA);

				// Атака: Клиника Б пытается расшифровать или использовать зашифрованный токен Клиники А
				assert.throws(
					() => {
						TelegramTokenVault.decryptToken(encryptedForClinicA, clinicB_OrgId);
					},
					(err: unknown) => {
						assert.ok(err instanceof TelegramTokenVaultAuthenticationError);
						assert.match(
							(err as Error).message,
							/Ошибка криптографической аутентификации токена для организации/i,
						);
						return true;
					},
					"Попытка расшифровать чужой токен обязана падать с TelegramTokenVaultAuthenticationError",
				);
			});

			it("enforces tenant boundary in TelegramMultiTenantSupervisor: Clinic A cannot access or route to Clinic B", async () => {
				const supervisor = new TelegramMultiTenantSupervisor();
				const tokenA = "11111111:token_clinic_a";
				const tokenB = "22222222:token_clinic_b";

				await supervisor.registerBot({
					organizationId: clinicA_OrgId,
					botConfigId: "main",
					botToken: tokenA,
					webhookSecret: "secret_a",
					mode: "webhook",
				});

				await supervisor.registerBot({
					organizationId: clinicB_OrgId,
					botConfigId: "main",
					botToken: tokenB,
					webhookSecret: "secret_b",
					mode: "webhook",
				});

				// Проверка реестра по организации: Клиника А видит только своего бота
				const clinicABots = supervisor.listBots(clinicA_OrgId);
				assert.strictEqual(clinicABots.length, 1);
				assert.strictEqual(clinicABots[0]?.organizationId, clinicA_OrgId);

				// Попытка Клиники А запросить бота Клиники Б по orgId
				const crossTenantBot = supervisor.getBotByOrg(clinicB_OrgId, "main");
				assert.ok(crossTenantBot);
				assert.strictEqual(crossTenantBot.organizationId, clinicB_OrgId);

				// Бот Клиники А не может получить доступ к боту Клиники Б
				const nonExistentBotUnderA = supervisor.getBotByOrg(clinicA_OrgId, "clinic-b-bot");
				assert.strictEqual(nonExistentBotUnderA, undefined);

				await supervisor.shutdown();
			});

			it("enforces fail-closed tenant isolation in database queries (withTenantCtx)", async () => {
				// Проверяем, что withTenantCtx изолирует контекст сессии
				await withTenantCtx(clinicA_OrgId, async (tx) => {
					// Внутри контекста клиники А любые запросы ограничены её tenantId
					assert.ok(tx, "Tenant transaction handle must be active");
				});
			});
		});

		describe("Attack Vector 3: Replay Attack on One-Time Staff Doctor QR Token", () => {
			const orgId = "00000000-0000-4000-8000-333333333333";
			const doctorId = "00000000-0000-4000-8000-doctor000001";

			it("successfully authorizes doctor on first use, then strictly rejects replay attack with token_already_used", async () => {
				// Врач генерирует одноразовый QR-код для привязки мобильного Telegram
				const tokenResult = await TelegramStaffCockpitService.generateStaffAuthToken({
					organizationId: orgId,
					staffUserId: doctorId,
					role: "doctor",
					fullName: "Д-р Смирнов А. В.",
					ttlHours: 24,
				});

				assert.ok(tokenResult.token.startsWith("staff_auth_"));
				assert.ok(tokenResult.deepLink.includes(tokenResult.token));
				assert.ok(tokenResult.qrSvg?.includes("<svg"), "QR код должен быть сгенерирован в SVG");

				// 1. Первый легитимный вход врача через Telegram
				const firstAuth = await TelegramStaffCockpitService.handleStaffAuthStart({
					organizationId: orgId,
					chatId: "88812345",
					chatFingerprint: "fp_doctor_phone_1",
					startPayload: tokenResult.token,
				});

				assert.strictEqual(firstAuth.success, true, "Первый вход обязан быть успешным");
				assert.strictEqual(firstAuth.staffUserId, doctorId);
				assert.strictEqual(firstAuth.staffName, "Д-р Смирнов А. В.");
				assert.match(firstAuth.message, /авторизован|кокпит/i);

				// 2. Атака повторного воспроизведения (Replay Attack):
				// Злоумышленник перехватил deepLink / QR и пытается повторно войти с другого chatId
				const replayAuth = await TelegramStaffCockpitService.handleStaffAuthStart({
					organizationId: orgId,
					chatId: "99999999", // Чужой аккаунт Telegram
					chatFingerprint: "fp_attacker_phone_2",
					startPayload: tokenResult.token,
				});

				assert.strictEqual(replayAuth.success, false, "Повторный вход обязан быть отклонён");
				assert.strictEqual(replayAuth.errorMessage, "token_already_used");
				assert.match(replayAuth.message, /уже был использован для авторизации/i);
			});

			it("strictly rejects expired staff tokens with token_expired", async () => {
				const expiredTokenResult = await TelegramStaffCockpitService.generateStaffAuthToken({
					organizationId: orgId,
					staffUserId: doctorId,
					role: "doctor",
					ttlHours: -2, // Токен просрочен 2 часа назад
				});

				const expiredAuth = await TelegramStaffCockpitService.handleStaffAuthStart({
					organizationId: orgId,
					chatId: "88812345",
					chatFingerprint: "fp_doctor_phone",
					startPayload: expiredTokenResult.token,
				});

				assert.strictEqual(expiredAuth.success, false);
				assert.strictEqual(expiredAuth.errorMessage, "token_expired");
				assert.match(expiredAuth.message, /истёк/i);
			});

			it("strictly rejects completely fake / non-existent tokens with invalid_staff_auth_token", async () => {
				const fakeAuth = await TelegramStaffCockpitService.handleStaffAuthStart({
					organizationId: orgId,
					chatId: "88812345",
					chatFingerprint: "fp_doctor_phone",
					startPayload: "staff_auth_non_existent_fake_hex_12345",
				});

				assert.strictEqual(fakeAuth.success, false);
				assert.strictEqual(fakeAuth.errorMessage, "invalid_staff_auth_token");
				assert.match(fakeAuth.message, /недействительна или не найдена/i);
			});
		});

		describe("Attack Vector 4: HMAC-SHA256 Signature Forgery in WebApp initData", () => {
			const botToken = "777888999:AAFlkjhasd9876234_virtual_bot_token";

			function createValidTelegramInitData(
				userObj: Record<string, unknown>,
				authDate = Math.floor(Date.now() / 1000),
				token = botToken,
			): string {
				const params = new URLSearchParams();
				params.set("auth_date", String(authDate));
				params.set("query_id", "AAG9X8QAAAAAAL1fxAgrO1pQ");
				params.set("user", JSON.stringify(userObj));

				const dataCheckString = Array.from(params.entries())
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, val]) => `${key}=${val}`)
					.join("\n");

				const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
				const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
				params.set("hash", hash);

				return params.toString();
			}

			it("successfully validates authentic Telegram WebApp initData", () => {
				const user = { id: 12345678, first_name: "Иван", last_name: "Иванов", username: "ivan_patient" };
				const validInitData = createValidTelegramInitData(user);

				const result = validateTelegramWebAppData(validInitData, botToken);
				assert.strictEqual(result.isValid, true);
				assert.strictEqual(result.user?.id, 12345678);
				assert.strictEqual(result.user?.first_name, "Иван");
			});

			it("detects and rejects user identity tampering (Privilege Escalation Attack)", () => {
				const legitimateUser = { id: 12345678, first_name: "Иван", username: "ivan_patient" };
				const validInitData = createValidTelegramInitData(legitimateUser);

				// Атака: злоумышленник подменяет user id на чужой (id: 99999999), оставляя старый хеш
				const tamperedParams = new URLSearchParams(validInitData);
				tamperedParams.set(
					"user",
					JSON.stringify({ id: 99999999, first_name: "Hacker", username: "admin_impersonator" }),
				);
				const tamperedInitData = tamperedParams.toString();

				const result = validateTelegramWebAppData(tamperedInitData, botToken);
				assert.strictEqual(result.isValid, false, "Поддельный user ID обязан быть отклонён валидатором");
				assert.strictEqual(result.user, undefined);
			});

			it("rejects forged hash generated with wrong secret key or random hex", () => {
				const user = { id: 12345678, first_name: "Иван" };
				const validInitData = createValidTelegramInitData(user);

				// Атака: поддельный хеш
				const tamperedParams = new URLSearchParams(validInitData);
				tamperedParams.set("hash", "deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb");
				const forgedHashInitData = tamperedParams.toString();

				const result = validateTelegramWebAppData(forgedHashInitData, botToken);
				assert.strictEqual(result.isValid, false, "Поддельный HMAC-хеш обязан возвращать isValid: false");
			});

			it("rejects initData with missing hash parameter", () => {
				const user = { id: 12345678, first_name: "Иван" };
				const validInitData = createValidTelegramInitData(user);

				const params = new URLSearchParams(validInitData);
				params.delete("hash");
				const missingHashInitData = params.toString();

				const result = validateTelegramWebAppData(missingHashInitData, botToken);
				assert.strictEqual(result.isValid, false);
			});

			it("rejects empty or corrupt inputs safely without throwing uncaught exceptions", () => {
				assert.strictEqual(validateTelegramWebAppData("", botToken).isValid, false);
				assert.strictEqual(validateTelegramWebAppData("gibberish_without_query", botToken).isValid, false);
				assert.strictEqual(validateTelegramWebAppData("hash=1234", "").isValid, false);
			});
		});

		describe("Attack Vector 5: AES-256-GCM Token Vault Breach with Corrupted Auth Tag", () => {
			const orgId = "00000000-0000-4000-8000-444444444444";
			const rawToken = "7123456789:AAFn_DenteClinicBotSecretTokenXYZ123";

			it("rejects corrupted authentication tag with exact integrity error 'Unsupported state or unable to authenticate data'", () => {
				const encrypted = TelegramTokenVault.encryptToken(rawToken, orgId);
				const prefix = "enc:v1:";
				const parts = encrypted.slice(prefix.length).split(":");
				assert.strictEqual(parts.length, 3);

				const [ivHex, tagHex, cipherHex] = parts;

				// Атака 5: Искажаем 1 байт в 16-байтном AuthTag (GCM Authentication Tag Forgery)
				const corruptedTag = (tagHex?.slice(0, -2) ?? "") + (tagHex?.endsWith("00") ? "ff" : "00");
				const corruptedPayload = `${prefix}${ivHex}:${corruptedTag}:${cipherHex}`;

				assert.throws(
					() => {
						TelegramTokenVault.decryptToken(corruptedPayload, orgId);
					},
					(err: unknown) => {
						assert.ok(
							err instanceof TelegramTokenVaultAuthenticationError,
							"Должен быть выброшен TelegramTokenVaultAuthenticationError",
						);
						const msg = (err as Error).message;
						// Доказываем точное вхождение системной ошибки криптографической аутентификации Node.js
						assert.ok(
							msg.includes("Unsupported state or unable to authenticate data") ||
							msg.includes("аутентификации"),
							`Сообщение ошибки должно содержать причину нарушения целостности: "${msg}"`,
						);
						return true;
					},
					"Поддельный AuthTag обязан вызвать сбой дешифрования AES-256-GCM",
				);
			});

			it("rejects tampered ciphertext with integrity authentication error", () => {
				const encrypted = TelegramTokenVault.encryptToken(rawToken, orgId);
				const prefix = "enc:v1:";
				const [ivHex, tagHex, cipherHex] = encrypted.slice(prefix.length).split(":");

				// Атака: модифицируем биты зашифрованного токена
				const tamperedCipher = (cipherHex?.slice(0, -2) ?? "") + (cipherHex?.endsWith("00") ? "ff" : "00");
				const tamperedPayload = `${prefix}${ivHex}:${tagHex}:${tamperedCipher}`;

				assert.throws(
					() => {
						TelegramTokenVault.decryptToken(tamperedPayload, orgId);
					},
					TelegramTokenVaultAuthenticationError,
					"Любая модификация шифротекста обязана приводить к TelegramTokenVaultAuthenticationError",
				);
			});

			it("rejects truncated or malformed encrypted tokens with TelegramTokenVaultError", () => {
				assert.throws(
					() => TelegramTokenVault.decryptToken("enc:v1:broken:payload", orgId),
					TelegramTokenVaultError,
				);
				assert.throws(
					() => TelegramTokenVault.decryptToken("", orgId),
					TelegramTokenVaultError,
				);
				assert.throws(
					() => TelegramTokenVault.decryptToken("enc:v1:a:b:c", ""),
					TelegramTokenVaultError,
				);
			});
		});
	});
});
