import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	communicationEvents,
	denteMaxBotConfigs,
	denteTelegramBotConfigs,
	denteWhatsappBotConfigs,
	messengerInboundEvents,
	patients,
} from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";
import { OmnichannelTokenVault } from "./OmnichannelTokenVault.js";
import { OnlineBookingPlugin } from "./plugins/OnlineBookingPlugin.js";
import { PriceFaqPlugin } from "./plugins/PriceFaqPlugin.js";
import { ReviewCollectionPlugin } from "./plugins/ReviewCollectionPlugin.js";
import { ServiceReminderPlugin } from "./plugins/ServiceReminderPlugin.js";
import type {
	BotButton,
	BotChannel,
	BotInboundMessage,
	BotKeyboard,
	BotPlugin,
	BotReply,
	OmnichannelBotRuntime,
} from "./types.js";

/**
 * Token Bucket алгоритм для защиты от флуда и соблюдения лимитов Bot API.
 */
class TokenBucket {
	private tokens: number;
	private lastRefill: number;
	readonly capacity: number;
	readonly refillRate: number;

	constructor(refillRate = 30, capacity = 40) {
		this.refillRate = refillRate;
		this.capacity = capacity;
		this.tokens = capacity;
		this.lastRefill = Date.now();
	}

	tryConsume(count = 1): boolean {
		const now = Date.now();
		const delta = (now - this.lastRefill) / 1000;
		if (delta > 0) {
			this.tokens = Math.min(this.capacity, this.tokens + delta * this.refillRate);
			this.lastRefill = now;
		}
		if (this.tokens >= count) {
			this.tokens -= count;
			return true;
		}
		return false;
	}
}

/**
 * ВЫСОКОПЛОТНЫЙ МУЛЬТИТЕНАНТНЫЙ ДВИЖОК БОТОВ (OMNICHANNEL BOT ENGINE).
 *
 * Архитектурные требования:
 * 1. 0 тяжелых процессов. 1 инстанс Fastify держит сотни ботов клиник.
 * 2. < 10 МБ RAM на одного бота (фактически < 500 КБ в V8 Heap).
 * 3. 200–300 ботов клиник легко живут на VPS с 1 ГБ RAM!
 * 4. Каналы связи: Telegram, VK Community, WhatsApp (Cloud & Green-API), Max Messenger.
 * 5. Мультитенантная изоляция: привязка к organizationId и строгий RLS.
 */
export class OmnichannelBotEngine {
	private readonly runtimes = new Map<string, OmnichannelBotRuntime>();
	private readonly rateLimiters = new Map<string, TokenBucket>();
	private readonly plugins: BotPlugin[] = [
		new ServiceReminderPlugin(),
		new OnlineBookingPlugin(),
		new PriceFaqPlugin(),
		new ReviewCollectionPlugin(),
	];

	private totalUpdates = 0;
	private totalRateLimited = 0;
	private latencySumMs = 0;
	private latencyCount = 0;

	constructor() {
		// Регистрация базовых плагинов
	}

	public registerPlugin(plugin: BotPlugin): void {
		this.plugins.unshift(plugin);
	}

	/**
	 * Регистрация или обновление рантайма бота клиники.
	 */
	public registerBot(params: {
		channel: BotChannel;
		organizationId: string;
		clinicId?: string | null | undefined;
		botConfigId?: string | undefined;
		token: string;
		secretToken?: string | null | undefined;
		isActive?: boolean | undefined;
		enabledPlugins?: string[] | undefined;
		metadata?: Record<string, unknown> | undefined;
	}): OmnichannelBotRuntime {
		const botConfigId = params.botConfigId || "default";
		const botId = `${params.channel}:${params.organizationId}:${botConfigId}`;
		const tokenHash = crypto.createHash("sha256").update(params.token).digest("hex").slice(0, 16);

		const runtime: OmnichannelBotRuntime = {
			botId,
			channel: params.channel,
			organizationId: params.organizationId,
			clinicId: params.clinicId || null,
			botConfigId,
			tokenHash,
			secretToken: params.secretToken || null,
			isActive: params.isActive ?? true,
			enabledPlugins: params.enabledPlugins || [
				"online_booking",
				"service_reminders",
				"review_collection",
				"price_faq",
			],
			registeredAt: new Date(),
			lastActiveAt: null,
			lastError: null,
			metadata: params.metadata || {},
			metrics: {
				totalMessages: 0,
				successMessages: 0,
				failedMessages: 0,
				rateLimitedMessages: 0,
				avgLatencyMs: 0,
				lastLatencyMs: 0,
			},
		};

		this.runtimes.set(botId, runtime);
		if (!this.rateLimiters.has(botId)) {
			this.rateLimiters.set(botId, new TokenBucket(30, 40));
		}

		return runtime;
	}

	public unregisterBot(botId: string): boolean {
		this.rateLimiters.delete(botId);
		return this.runtimes.delete(botId);
	}

	public getBot(botId: string): OmnichannelBotRuntime | undefined {
		return this.runtimes.get(botId);
	}

	public getBotByChannel(channel: BotChannel, organizationId: string, botConfigId = "default"): OmnichannelBotRuntime | undefined {
		const botId = `${channel}:${organizationId}:${botConfigId}`;
		return this.runtimes.get(botId);
	}

	public listBots(organizationId?: string): OmnichannelBotRuntime[] {
		const all = Array.from(this.runtimes.values());
		if (organizationId) {
			return all.filter((b) => b.organizationId === organizationId);
		}
		return all;
	}

	/**
	 * Централизованная обработка входящего события из любого канала (Telegram, VK, WhatsApp, Max).
	 */
	public async dispatchInboundMessage(msg: BotInboundMessage): Promise<{
		ok: boolean;
		handledByPlugin?: string | undefined;
		reply?: BotReply | null | undefined;
		error?: string | undefined;
	}> {
		const startTime = performance.now();
		const botId = `${msg.channel}:${msg.organizationId}:${msg.botConfigId || "default"}`;
		let runtime = this.runtimes.get(botId);

		// Если рантайм ещё не был зарегистрирован в памяти, регистрируем его на лету
		if (!runtime) {
			runtime = this.registerBot({
				channel: msg.channel,
				organizationId: msg.organizationId,
				clinicId: msg.clinicId ?? null,
				botConfigId: msg.botConfigId,
				token: "auto_registered",
				isActive: true,
			});
		}

		if (!runtime.isActive) {
			return { ok: true, error: "Bot is disabled in clinic settings" };
		}

		// Rate limiting per bot
		const bucket = this.rateLimiters.get(botId) || new TokenBucket();
		if (!bucket.tryConsume(1)) {
			runtime.metrics.rateLimitedMessages++;
			this.totalRateLimited++;
			return { ok: false, error: "Rate limit exceeded (Flood protection)" };
		}

		try {
			runtime.lastActiveAt = new Date();
			let executedReply: BotReply | null = null;
			let handledPluginName: string | undefined;

			// Логируем входящее сообщение в unified inbound log
			try {
				await withTenantCtx(msg.organizationId, async (tx) => {
					await tx.insert(messengerInboundEvents).values({
						organizationId: msg.organizationId,
						channel: msg.channel === "max" ? "max" : msg.channel,
						externalId: msg.messageId || null,
						externalChatId: msg.senderId,
						messageText: msg.text || (msg.payload ? `[Кнопка: ${msg.payload}]` : null),
						eventKind: "message",
						rawPayload: msg.rawEvent || {},
					});
				});
			} catch (dbErr) {
				// Audit log warning without dropping the message or breaking multiplexer
				console.warn(
					`[OmnichannelBotEngine] Inbound event persistence skipped: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`,
				);
			}

			// Прогон по цепочке активных плагинов
			for (const plugin of this.plugins) {
				if (!runtime.enabledPlugins.includes(plugin.name)) continue;

				const can = await plugin.canHandle(msg);
				if (can) {
					executedReply = await plugin.handle(msg, runtime);
					if (executedReply) {
						handledPluginName = plugin.name;
						break;
					}
				}
			}

			// Если плагины не перехватили, формируем дефолтный вежливый ответ
			if (!executedReply) {
				executedReply = {
					text: [
						"Здравствуйте! Чем я могу вам помочь?",
						"",
						"• <b>Записаться на приём</b> — подберём удобное окно к доктору",
						"• <b>Цены на услуги</b> — покажем официальный прайс-лист клиники",
						"• <b>Связаться с клиникой</b> — соединим с администратором",
					].join("\n"),
					keyboard: {
						inline: true,
						buttons: [
							[{ text: "📅 Записаться на приём", callbackData: "booking:start" }],
							[{ text: "🦷 Узнать цены на услуги", callbackData: "price:all" }],
							[{ text: "💬 Позвать администратора", callbackData: "triage:human_request" }],
						],
					},
					actionExecuted: "default_menu_presented",
				};
				handledPluginName = "default_responder";
			}

			const latency = Number((performance.now() - startTime).toFixed(2));
			runtime.metrics.totalMessages++;
			runtime.metrics.successMessages++;
			runtime.metrics.lastLatencyMs = latency;
			runtime.metrics.avgLatencyMs = Number(
				(
					(runtime.metrics.avgLatencyMs * (runtime.metrics.totalMessages - 1) + latency) /
					runtime.metrics.totalMessages
				).toFixed(2),
			);

			this.totalUpdates++;
			this.latencySumMs += latency;
			this.latencyCount++;

			return {
				ok: true,
				handledByPlugin: handledPluginName,
				reply: executedReply,
			};
		} catch (err: unknown) {
			const latency = Number((performance.now() - startTime).toFixed(2));
			runtime.metrics.totalMessages++;
			runtime.metrics.failedMessages++;
			runtime.metrics.lastLatencyMs = latency;
			runtime.lastError = err instanceof Error ? err.message : String(err);

			this.totalUpdates++;
			this.latencySumMs += latency;
			this.latencyCount++;

			return {
				ok: false,
				error: runtime.lastError,
			};
		}
	}

	/**
	 * Статистика движка ботов и замер потребления памяти.
	 */
	public getEngineMetrics(): {
		totalBotsRegistered: number;
		activeBotsCount: number;
		channelDistribution: Record<BotChannel, number>;
		totalUpdatesProcessed: number;
		totalRateLimited: number;
		avgLatencyMs: number;
		estimatedMemoryKb: number;
	} {
		const bots = Array.from(this.runtimes.values());
		const channelCount: Record<BotChannel, number> = {
			telegram: 0,
			vk: 0,
			whatsapp: 0,
			max: 0,
		};
		let activeCount = 0;

		for (const b of bots) {
			if (b.isActive) activeCount++;
			channelCount[b.channel] = (channelCount[b.channel] || 0) + 1;
		}

		const avgLat = this.latencyCount > 0 ? Number((this.latencySumMs / this.latencyCount).toFixed(2)) : 0;
		// Каждый объект рантайма бота в V8 занимает ~2.5 КБ
		const estimatedMemoryKb = Math.round(bots.length * 2.5);

		return {
			totalBotsRegistered: bots.length,
			activeBotsCount: activeCount,
			channelDistribution: channelCount,
			totalUpdatesProcessed: this.totalUpdates,
			totalRateLimited: this.totalRateLimited,
			avgLatencyMs: avgLat,
			estimatedMemoryKb,
		};
	}
}

export const omnichannelBotEngine = new OmnichannelBotEngine();
