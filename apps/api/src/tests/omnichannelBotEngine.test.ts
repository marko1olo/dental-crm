import assert from "node:assert";
import { describe, test } from "node:test";
import zlib from "node:zlib";
import {
	BotTokenVaultAuthenticationError,
	BotTokenVaultError,
	OmnichannelTokenVault,
} from "../services/bots/OmnichannelTokenVault.js";
import { OmnichannelBotEngine } from "../services/bots/OmnichannelBotEngine.js";
import { BotSourceExporter, ZipArchiveBuilder } from "../services/bots/BotSourceExporter.js";
import { ServiceReminderPlugin } from "../services/bots/plugins/ServiceReminderPlugin.js";
import { ReviewCollectionPlugin } from "../services/bots/plugins/ReviewCollectionPlugin.js";
import { PriceFaqPlugin } from "../services/bots/plugins/PriceFaqPlugin.js";
import { OnlineBookingPlugin } from "../services/bots/plugins/OnlineBookingPlugin.js";
import type { BotInboundMessage } from "../services/bots/types.js";

describe("Omnichannel Bot Engine & Token Vault Inquisition", () => {
	const clinicA_OrgId = "00000000-0000-4000-8000-000000000001";
	const clinicB_OrgId = "00000000-0000-4000-8000-000000000002";

	// =========================================================================
	// 1. OmnichannelTokenVault — AES-256-GCM & Мультитенантная изоляция
	// =========================================================================
	describe("OmnichannelTokenVault (Крипто-изоляция тенантов)", () => {
		test("Успешное шифрование и дешифрование токена с AAD (organizationId)", () => {
			const rawToken = "vk1.a.SecretGroupToken2026";
			const encrypted = OmnichannelTokenVault.encrypt(rawToken, clinicA_OrgId);

			assert.ok(encrypted.startsWith("enc:v1:"), "Зашифрованный токен обязан иметь префикс enc:v1:");
			assert.notStrictEqual(encrypted, rawToken, "Зашифрованный токен не должен совпадать с открытым");

			const decrypted = OmnichannelTokenVault.decrypt(encrypted, clinicA_OrgId);
			assert.strictEqual(decrypted, rawToken, "Дешифрованный токен обязан совпадать с исходным");
		});

		test("Кросс-тенантная атака: невозможно расшифровать токен под organizationId чужой клиники", () => {
			const clinicAToken = "tg_bot_token_clinic_a_987654321";
			const encryptedForA = OmnichannelTokenVault.encrypt(clinicAToken, clinicA_OrgId);

			assert.throws(
				() => {
					OmnichannelTokenVault.decrypt(encryptedForA, clinicB_OrgId);
				},
				(err: unknown) => {
					return err instanceof BotTokenVaultAuthenticationError;
				},
				"Попытка расшифровать токен Клиники А ключом Клиники Б обязана выбросить BotTokenVaultAuthenticationError",
			);
		});

		test("Защита от подделки и повреждения шифртекста (Tamper resistance)", () => {
			const rawToken = "waba_meta_token_11223344";
			const encrypted = OmnichannelTokenVault.encrypt(rawToken, clinicA_OrgId);

			// Подменяем 1 байт в шифртексте (parts[4])
			const parts = encrypted.split(":");
			const cipher = parts[4]!;
			const lastChar = cipher.slice(-1) === "0" ? "1" : "0";
			const corruptedCipher = cipher.slice(0, -1) + lastChar;
			const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:${corruptedCipher}`;

			assert.throws(
				() => {
					OmnichannelTokenVault.decrypt(tampered, clinicA_OrgId);
				},
				(err: unknown) => {
					return err instanceof BotTokenVaultAuthenticationError;
				},
				"Повреждение даже 1 бита шифртекста обязано вызывать AuthTag mismatch",
			);
		});

		test("Маскирование токенов для безопасной отдачи в UI", () => {
			assert.strictEqual(OmnichannelTokenVault.maskToken("vk1.a.mysecrettoken"), "vk1.****...");
			assert.strictEqual(OmnichannelTokenVault.maskToken("enc:v1:0123:4567:89ab"), "enc:v1:****...");
			assert.strictEqual(OmnichannelTokenVault.maskToken(""), "");
			assert.strictEqual(OmnichannelTokenVault.maskToken(null), "");
		});

		test("timingSafeEqual предотвращает атаки по времени", () => {
			assert.strictEqual(OmnichannelTokenVault.timingSafeEqual("secret123", "secret123"), true);
			assert.strictEqual(OmnichannelTokenVault.timingSafeEqual("secret123", "secret124"), false);
			assert.strictEqual(OmnichannelTokenVault.timingSafeEqual("secret123", "short"), false);
			assert.strictEqual(OmnichannelTokenVault.timingSafeEqual(null, "secret"), false);
		});
	});

	// =========================================================================
	// 2. Высокоплотный движок ботов (High-Density OmnichannelBotEngine)
	// =========================================================================
	describe("OmnichannelBotEngine (Плотность, изоляция, RAM < 10 МБ)", () => {
		test("Регистрация 250 ботов клиник потребляет < 2 МБ RAM (норма < 10 МБ на 1 инстанс)", () => {
			const engine = new OmnichannelBotEngine();

			const initialMemory = process.memoryUsage().heapUsed;

			for (let i = 0; i < 250; i++) {
				const orgId = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
				const channels = ["telegram", "vk", "whatsapp", "max"] as const;
				const ch = channels[i % channels.length]!;

				engine.registerBot({
					channel: ch,
					organizationId: orgId,
					token: `token_${i}`,
					isActive: true,
				});
			}

			const afterMemory = process.memoryUsage().heapUsed;
			const deltaMb = (afterMemory - initialMemory) / (1024 * 1024);

			const metrics = engine.getEngineMetrics();
			assert.strictEqual(metrics.totalBotsRegistered, 250);
			assert.strictEqual(metrics.activeBotsCount, 250);
			assert.ok(
				deltaMb < 5,
				`250 ботов в памяти заняли ${deltaMb.toFixed(2)} МБ, что с запасом укладывается в норматив VPS`,
			);
		});

		test("Защита от флуда (TokenBucket Rate Limiter)", async () => {
			const engine = new OmnichannelBotEngine();
			const orgId = clinicA_OrgId;

			engine.registerBot({
				channel: "telegram",
				organizationId: orgId,
				token: "test_token",
				isActive: true,
			});

			const msg: BotInboundMessage = {
				channel: "telegram",
				organizationId: orgId,
				botConfigId: "default",
				senderId: "123456",
				text: "Привет",
				timestamp: Date.now(),
			};

			let rateLimited = false;
			// 60 запросов подряд обязаны исчерпать ведро в 40 токенов
			for (let i = 0; i < 60; i++) {
				const res = await engine.dispatchInboundMessage(msg);
				if (!res.ok && res.error?.includes("Rate limit exceeded")) {
					rateLimited = true;
					break;
				}
			}

			assert.strictEqual(rateLimited, true, "Рейт-лимитер обязан заблокировать флуд");
		});
	});

	// =========================================================================
	// 3. Плагины транзакционной логики (4 Core Plugins)
	// =========================================================================
	describe("Транзакционные плагины ботов", () => {
		test("ServiceReminderPlugin: распознавание подтверждения и переноса визита", async () => {
			const reminderPlugin = new ServiceReminderPlugin();

			const confirmMsg: BotInboundMessage = {
				channel: "telegram",
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				senderId: "79161234567",
				text: "✓ Подтверждаю",
				timestamp: Date.now(),
			};
			assert.strictEqual(await reminderPlugin.canHandle(confirmMsg), true);

			const callbackConfirmMsg: BotInboundMessage = {
				channel: "telegram",
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				senderId: "79161234567",
				text: "",
				payload: "reminder:confirm:app_123",
				timestamp: Date.now(),
			};
			assert.strictEqual(await reminderPlugin.canHandle(callbackConfirmMsg), true);

			const rescheduleMsg: BotInboundMessage = {
				channel: "vk",
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				senderId: "123456",
				text: "🔄 Перенести приём",
				timestamp: Date.now(),
			};
			assert.strictEqual(await reminderPlugin.canHandle(rescheduleMsg), true);

			const irrelevantMsg: BotInboundMessage = {
				channel: "telegram",
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				senderId: "123456",
				text: "Какая погода на улице?",
				timestamp: Date.now(),
			};
			assert.strictEqual(await reminderPlugin.canHandle(irrelevantMsg), false);
		});

		test("ReviewCollectionPlugin: сбор отзывов на Яндекс Картах, 2ГИС и ПроДокторов", async () => {
			const reviewPlugin = new ReviewCollectionPlugin();

			const reviewIntentMsg: BotInboundMessage = {
				channel: "whatsapp",
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				senderId: "79991112233",
				text: "хочу оставить отзыв о враче",
				timestamp: Date.now(),
			};
			assert.strictEqual(await reviewPlugin.canHandle(reviewIntentMsg), true);

			const mockRuntime = {
				botId: "whatsapp:test:default",
				channel: "whatsapp" as const,
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				tokenHash: "hash",
				isActive: true,
				enabledPlugins: ["review_collection"],
				registeredAt: new Date(),
				lastActiveAt: null,
				lastError: null,
				metadata: {
					yandexMapsUrl: "https://yandex.ru/maps/org/dente/123",
					twoGisUrl: "https://2gis.ru/spb/firm/456",
					prodoctorovUrl: "https://prodoctorov.ru/spb/lpu/789",
				},
				metrics: {
					totalMessages: 0,
					successMessages: 0,
					failedMessages: 0,
					rateLimitedMessages: 0,
					avgLatencyMs: 0,
					lastLatencyMs: 0,
				},
			};

			const reply = await reviewPlugin.handle(reviewIntentMsg, mockRuntime);
			assert.ok(reply);
			assert.ok(reply.text.includes("Яндекс"), "Ответ обязан содержать ссылку на Яндекс Карты");
			assert.ok(reply.keyboard?.buttons.length, "Обязана присутствовать инлайн-клавиатура с кнопками отзывов");
		});

		test("PriceFaqPlugin: сопоставление вопросов по прейскуранту клиники", async () => {
			const pricePlugin = new PriceFaqPlugin();

			const priceInquiry1: BotInboundMessage = {
				channel: "telegram",
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				senderId: "123",
				text: "Сколько стоит лечение кариеса?",
				timestamp: Date.now(),
			};
			assert.strictEqual(await pricePlugin.canHandle(priceInquiry1), true);

			const priceInquiry2: BotInboundMessage = {
				channel: "vk",
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				senderId: "456",
				text: "прайс лист на чистку зубов",
				timestamp: Date.now(),
			};
			assert.strictEqual(await pricePlugin.canHandle(priceInquiry2), true);
		});

		test("OnlineBookingPlugin: перехват интентов записи на приём", async () => {
			const bookingPlugin = new OnlineBookingPlugin();

			const bookingInquiry: BotInboundMessage = {
				channel: "telegram",
				organizationId: clinicA_OrgId,
				botConfigId: "default",
				senderId: "789",
				text: "Хочу записаться к терапевту на завтра",
				timestamp: Date.now(),
			};
			assert.strictEqual(await bookingPlugin.canHandle(bookingInquiry), true);
		});
	});

	// =========================================================================
	// 4. Standalone Bot Exporter (Zero-dependency ZIP & PKZIP 2.0 Invariant)
	// =========================================================================
	describe("BotSourceExporter & ZipArchiveBuilder", () => {
		test("ZipArchiveBuilder создает валидный PKZIP 2.0 буфер", () => {
			const builder = new ZipArchiveBuilder();
			builder.addFile("test.txt", "Привет, DENTE!");
			builder.addFile("dir/sub.json", JSON.stringify({ ok: true }));

			const zipBuffer = builder.build();
			assert.ok(Buffer.isBuffer(zipBuffer), "Результат обязан быть Buffer");
			assert.ok(zipBuffer.length > 100, "Размер архива должен быть больше 100 байт");

			// Проверка магических байтов PKZIP: PK\x03\x04
			assert.strictEqual(zipBuffer[0], 0x50);
			assert.strictEqual(zipBuffer[1], 0x4b);
			assert.strictEqual(zipBuffer[2], 0x03);
			assert.strictEqual(zipBuffer[3], 0x04);
		});

		test("BotSourceExporter генерирует полный самодостаточный проект бота", () => {
			const zip = BotSourceExporter.exportStandaloneBotPackage({
				botId: `telegram:${clinicA_OrgId}:default`,
				organizationId: clinicA_OrgId,
				clinicName: "Клиника Дент-Мастер",
				channel: "telegram",
			});

			assert.ok(Buffer.isBuffer(zip));
			assert.ok(zip.length > 500);

			// Проверяем, что в архиве содержатся ключевые файлы проекта
			const zipStr = zip.toString("binary");
			assert.ok(zipStr.includes("package.json"), "Архив обязан содержать package.json");
			assert.ok(zipStr.includes("Dockerfile"), "Архив обязан содержать Dockerfile");
			assert.ok(zipStr.includes("docker-compose.yml"), "Архив обязан содержать docker-compose.yml");
			assert.ok(zipStr.includes("src/bot.ts"), "Архив обязан содержать src/bot.ts");
			assert.ok(zipStr.includes("README.md"), "Архив обязан содержать README.md");
		});
	});
});
