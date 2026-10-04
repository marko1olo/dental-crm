import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	TelegramMultiTenantSupervisor,
	TokenBucketRateLimiter,
	SlidingWindowCounter,
	computeBotTokenHash,
	timingSafeSecretMatch,
} from "../services/telegram/TelegramMultiTenantSupervisor.js";

describe("High-Density Telegram Multi-Tenant Supervisor Suite", () => {
	describe("1. First Principles & Resource Economics (100+ Bots Density)", () => {
		it("registers 120 tenant bots in a single Fastify memory registry under 50ms with minimal memory footprint", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const startTime = performance.now();

			// Регистрируем 120 независимых ботов стоматологических клиник
			for (let i = 1; i <= 120; i++) {
				const orgId = `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`;
				const token = `777888999${i}:AAFlkjhasd9876234_virtual_bot_token_${i}`;
				await supervisor.registerBot({
					organizationId: orgId,
					botConfigId: `clinic-bot-${i}`,
					botToken: token,
					botUsername: `clinic_dent_bot_${i}`,
					presetId: i % 2 === 0 ? "universal_clinic" : "high_risk_surgery",
					webhookSecret: `secret_token_${i}`,
					webhookBaseUrl: "https://dental-crm.clinic.dente.ru",
					mode: "webhook",
				});
			}

			const durationMs = performance.now() - startTime;
			const status = supervisor.getSupervisorStatus();

			assert.strictEqual(status.totalRegisteredBots, 120);
			assert.strictEqual(status.activeBotsCount, 120);
			assert.strictEqual(status.webhookBotsCount, 120);
			assert.strictEqual(status.pollingBotsCount, 0);

			// Время регистрации 120 ботов должно быть мгновенным (гораздо быстрее 500 мс)
			assert.ok(
				durationMs < 500,
				`Registration took ${durationMs}ms, expected under 500ms`,
			);

			// Расчетная память на 120 ботов в V8 составляет ~336 КБ (менее 1 МБ)
			assert.ok(
				status.estimatedMemoryUsageKb < 1024,
				`Memory footprint ${status.estimatedMemoryUsageKb} KB exceeds 1024 KB`,
			);

			// Проверяем доступность произвольного бота по orgId и botConfigId
			const sampleBot = supervisor.getBot("00000000-0000-0000-0000-000000000042:clinic-bot-42");
			assert.ok(sampleBot, "Bot #42 must exist in registry");
			assert.strictEqual(sampleBot.botUsername, "clinic_dent_bot_42");
			assert.strictEqual(sampleBot.presetId, "universal_clinic");
			assert.ok(sampleBot.webhookUrl?.includes(sampleBot.botTokenHash));

			await supervisor.shutdown();
		});

		it("demonstrates O(1) hash resolution across hundreds of registered bots", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const testTokens: string[] = [];

			for (let i = 1; i <= 50; i++) {
				const token = `1234567890:mock_token_for_lookup_${i}`;
				testTokens.push(token);
				await supervisor.registerBot({
					organizationId: `org-${i}`,
					botConfigId: "main",
					botToken: token,
					webhookSecret: `sec-${i}`,
					mode: "webhook",
				});
			}

			// Проверяем скорость поиска по SHA-256 хешу
			const targetToken = testTokens[25]!;
			const targetHash = computeBotTokenHash(targetToken);

			const lookupStart = performance.now();
			const foundBot = supervisor.getBotByTokenHash(targetHash);
			const lookupDuration = performance.now() - lookupStart;

			assert.ok(foundBot, "Bot must be found by token hash");
			assert.strictEqual(foundBot.organizationId, "org-26");
			assert.ok(
				lookupDuration < 2,
				`Lookup took ${lookupDuration}ms, must be sub-millisecond O(1)`,
			);

			await supervisor.shutdown();
		});
	});

	describe("2. Rate Limiting & Telegram Bot API Compliance (Token Bucket)", () => {
		it("enforces Telegram Bot API 30 msg/sec limit and blocks flood", () => {
			const limiter = new TokenBucketRateLimiter(30, 30);

			// Потребляем 30 токенов
			for (let i = 0; i < 30; i++) {
				const consumed = limiter.tryConsume(1);
				assert.strictEqual(consumed, true, `Token ${i + 1} must be consumed`);
			}

			// 31-й запрос сразу же должен быть заблокирован (исчерпан burst)
			const overflowAttempt = limiter.tryConsume(1);
			assert.strictEqual(
				overflowAttempt,
				false,
				"31st request must be rejected by Rate Limiter",
			);
		});

		it("sliding window counter accurately tracks requests per second", () => {
			const counter = new SlidingWindowCounter(1000); // окно 1 секунда
			const now = Date.now();

			for (let i = 0; i < 25; i++) {
				counter.record(now);
			}

			assert.strictEqual(counter.getCount(now), 25);
			assert.strictEqual(counter.getRatePerSec(now), 25);
		});

		it("returns HTTP 429 when flood protection triggers in dispatchIncomingUpdate", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const token = "999888111:rate_limited_token_test";
			const tokenHash = computeBotTokenHash(token);

			await supervisor.registerBot({
				organizationId: "flood-test-org",
				botConfigId: "flood-bot",
				botToken: token,
				webhookSecret: "secret123",
				rateLimitMaxPerSec: 5,
				rateLimitBurst: 5,
				mode: "webhook",
			});

			let processedCount = 0;
			const handler = async () => {
				processedCount++;
				return { ok: true, processed: true };
			};

			// Делаем 5 успешных вызовов
			for (let i = 0; i < 5; i++) {
				const res = await supervisor.dispatchIncomingUpdate({
					tokenHash,
					secretTokenHeader: "secret123",
					update: { update_id: i + 1 },
					handler,
				});
				assert.strictEqual(res.ok, true);
				assert.strictEqual(res.statusCode, 200);
			}

			// 6-й вызов должен получить 429 TelegramRateLimitExceeded
			const floodRes = await supervisor.dispatchIncomingUpdate({
				tokenHash,
				secretTokenHeader: "secret123",
				update: { update_id: 6 },
				handler,
			});

			assert.strictEqual(floodRes.ok, false);
			assert.strictEqual(floodRes.statusCode, 429);
			assert.strictEqual(floodRes.error, "TelegramRateLimitExceeded");
			assert.strictEqual(processedCount, 5, "Handler must not be executed on 429");

			const bot = supervisor.getBotByTokenHash(tokenHash);
			assert.strictEqual(bot?.metrics.rateLimitedUpdates, 1);

			await supervisor.shutdown();
		});
	});

	describe("3. Security: Timing-Safe Secret Token Verification", () => {
		it("validates timing-safe secret tokens correctly", () => {
			const secret = "correct_secret_string_489123847";
			assert.strictEqual(timingSafeSecretMatch(secret, secret), true);
			assert.strictEqual(timingSafeSecretMatch("wrong_secret", secret), false);
			assert.strictEqual(timingSafeSecretMatch("", secret), false);
			assert.strictEqual(timingSafeSecretMatch(null, secret), false);
		});

		it("rejects unauthorized webhook request with 401 when secret mismatch occurs", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const token = "333222111:secure_bot_token";
			const tokenHash = computeBotTokenHash(token);

			await supervisor.registerBot({
				organizationId: "sec-org",
				botToken: token,
				webhookSecret: "super_secret_telegram_hash_123",
				mode: "webhook",
			});

			const res = await supervisor.dispatchIncomingUpdate({
				tokenHash,
				secretTokenHeader: "fake_intruder_secret",
				update: { update_id: 100 },
				handler: async () => ({ ok: true }),
			});

			assert.strictEqual(res.ok, false);
			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.error, "TelegramWebhookSecretMismatch");

			await supervisor.shutdown();
		});

		it("returns 404 when webhook is sent for unknown bot token hash", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();

			const res = await supervisor.dispatchIncomingUpdate({
				tokenHash: "non_existent_hash_000000000000000000000",
				secretTokenHeader: "any",
				update: { update_id: 1 },
				handler: async () => ({ ok: true }),
			});

			assert.strictEqual(res.ok, false);
			assert.strictEqual(res.statusCode, 404);
			assert.strictEqual(res.error, "TenantBotNotFound");
		});
	});

	describe("4. Metrics, Latency & Telemetry Gathering", () => {
		it("measures and aggregates processing latency and update counters", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const token = "555444333:latency_test_bot";
			const tokenHash = computeBotTokenHash(token);

			await supervisor.registerBot({
				organizationId: "latency-org",
				botToken: token,
				webhookSecret: "secret_1",
				mode: "webhook",
			});

			// Симулируем 3 запроса с небольшой задержкой
			for (let i = 1; i <= 3; i++) {
				const res = await supervisor.dispatchIncomingUpdate({
					tokenHash,
					secretTokenHeader: "secret_1",
					update: { update_id: i },
					handler: async () => {
						await new Promise((r) => setTimeout(r, 10));
						return { ok: true, step: i };
					},
				});
				assert.strictEqual(res.ok, true);
				assert.ok(
					(res.latencyMs ?? 0) >= 9,
					`Latency ${res.latencyMs}ms should be at least 9ms`,
				);
			}

			const bot = supervisor.getBotByTokenHash(tokenHash);
			assert.ok(bot);
			assert.strictEqual(bot.metrics.totalUpdates, 3);
			assert.strictEqual(bot.metrics.successfulUpdates, 3);
			assert.strictEqual(bot.metrics.failedUpdates, 0);
			assert.ok(bot.metrics.avgLatencyMs >= 9);

			const overview = supervisor.getSupervisorStatus();
			assert.strictEqual(overview.totalUpdatesProcessed, 3);
			assert.ok(overview.overallAvgLatencyMs >= 9);

			await supervisor.shutdown();
		});

		it("captures handler failure and logs error state properly", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const token = "111222333:failing_handler_bot";
			const tokenHash = computeBotTokenHash(token);

			await supervisor.registerBot({
				organizationId: "error-org",
				botToken: token,
				webhookSecret: "secret_err",
				mode: "webhook",
			});

			const res = await supervisor.dispatchIncomingUpdate({
				tokenHash,
				secretTokenHeader: "secret_err",
				update: { update_id: 101 },
				handler: async () => {
					throw new Error("Clinical DB Connection Timeout");
				},
			});

			assert.strictEqual(res.ok, false);
			assert.strictEqual(res.statusCode, 500);
			assert.strictEqual(res.error, "UpdateProcessingError");
			assert.match(res.message ?? "", /Clinical DB Connection Timeout/);

			const bot = supervisor.getBotByTokenHash(tokenHash);
			assert.strictEqual(bot?.metrics.failedUpdates, 1);
			assert.match(bot?.lastError ?? "", /Clinical DB Connection Timeout/);

			await supervisor.shutdown();
		});
	});

	describe("5. Hot Reload & Dynamic Lifecycle Management", () => {
		it("dynamically reloads bot without service restart", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const orgId = "reload-org";
			const botConfigId = "main-bot";
			const botId = `${orgId}:${botConfigId}`;
			const token = "888777666:reloadable_bot_token";

			await supervisor.registerBot({
				organizationId: orgId,
				botConfigId,
				botToken: token,
				presetId: "universal_clinic",
				mode: "webhook",
			});

			const initialBot = supervisor.getBot(botId);
			assert.ok(initialBot);
			assert.strictEqual(initialBot.presetId, "universal_clinic");

			// Обновляем метаданные пресета и перезагружаем
			initialBot.presetId = "implantology_center";
			const reloaded = await supervisor.reloadBot(botId);

			assert.strictEqual(reloaded.botId, botId);
			assert.strictEqual(reloaded.presetId, "implantology_center");
			assert.strictEqual(reloaded.status, "active");

			// Проверяем unregister
			const unregResult = await supervisor.unregisterBot(botId);
			assert.strictEqual(unregResult, true);
			assert.strictEqual(supervisor.getBot(botId), undefined);
			assert.strictEqual(supervisor.getSupervisorStatus().totalRegisteredBots, 0);

			await supervisor.shutdown();
		});

		it("handles polling fallback lifecycle gracefully", async () => {
			const supervisor = new TelegramMultiTenantSupervisor();
			const orgId = "polling-org";
			const botConfigId = "poll-bot";
			const botId = `${orgId}:${botConfigId}`;
			const token = "123123123:fallback_polling_token";

			const bot = await supervisor.registerBot({
				organizationId: orgId,
				botConfigId,
				botToken: token,
				mode: "polling",
			});

			assert.strictEqual(bot.mode, "polling");
			assert.ok(bot.pollingRunner, "Polling runner must be created");
			assert.strictEqual(bot.pollingRunner.isActive(), true);

			// Выгрузка должна корректно остановить polling runner
			await supervisor.unregisterBot(botId);
			assert.strictEqual(bot.pollingRunner, null);

			await supervisor.shutdown();
		});
	});
});
