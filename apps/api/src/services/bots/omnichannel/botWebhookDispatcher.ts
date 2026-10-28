import { BotPatientStateStorage } from "./botPatientStateStorage.js";
import type { BotSessionRouter } from "./botSessionRouter.js";
import type {
	BotInboundMessage,
	BotPlugin,
	BotReply,
	OmnichannelBotRuntime,
} from "../types.js";

export interface DispatchInboundResult {
	ok: boolean;
	handledByPlugin?: string | undefined;
	reply?: BotReply | null | undefined;
	error?: string | undefined;
}

export interface DispatchTelemetryStats {
	totalUpdates: number;
	totalRateLimited: number;
	latencySumMs: number;
	latencyCount: number;
}

/**
 * Диспетчер входящих вебхуков и сообщений ботов различных каналов (Telegram, VK, WhatsApp, Max).
 */
export class BotWebhookDispatcher {
	public static createDefaultReply(): BotReply {
		return {
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
	}

	public static async dispatchInboundMessage(params: {
		msg: BotInboundMessage;
		sessionRouter: BotSessionRouter;
		plugins: BotPlugin[];
		telemetry: DispatchTelemetryStats;
	}): Promise<DispatchInboundResult> {
		const { msg, sessionRouter, plugins, telemetry } = params;
		const startTime = performance.now();
		const botId = `${msg.channel}:${msg.organizationId}:${msg.botConfigId || "default"}`;
		let runtime = sessionRouter.getBot(botId);

		// Если рантайм ещё не был зарегистрирован в памяти, регистрируем его на лету
		if (!runtime) {
			runtime = sessionRouter.registerBot({
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
		const bucket = sessionRouter.getRateLimiter(botId);
		if (!bucket.tryConsume(1)) {
			runtime.metrics.rateLimitedMessages++;
			telemetry.totalRateLimited++;
			return { ok: false, error: "Rate limit exceeded (Flood protection)" };
		}

		try {
			runtime.lastActiveAt = new Date();
			let executedReply: BotReply | null = null;
			let handledPluginName: string | undefined;

			const isIntercepted = sessionRouter.isChatIntercepted(
				msg.channel,
				msg.organizationId,
				msg.senderId,
			);

			// Сквозная персистентность входящего события в БД CRM
			const { patientId: savedPatientId, patientName: savedPatientName } =
				await BotPatientStateStorage.persistInboundEvent(msg, isIntercepted);

			// Если диалог перехвачен оператором клиники — автоответчик бота встает на паузу!
			if (isIntercepted) {
				return {
					ok: true,
					handledByPlugin: "human_operator_intercepted",
					reply: null,
				};
			}

			// Прогон по цепочке активных плагинов
			for (const plugin of plugins) {
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
				executedReply = BotWebhookDispatcher.createDefaultReply();
				handledPluginName = "default_responder";
			}

			// Фиксируем автоответ бота в communicationEvents
			if (savedPatientId && executedReply) {
				await BotPatientStateStorage.persistBotReply({
					organizationId: msg.organizationId,
					patientId: savedPatientId,
					patientName: savedPatientName,
					channel: msg.channel,
					senderId: msg.senderId,
					replyText: executedReply.text,
					actionExecuted: executedReply.actionExecuted,
				});
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

			telemetry.totalUpdates++;
			telemetry.latencySumMs += latency;
			telemetry.latencyCount++;

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

			telemetry.totalUpdates++;
			telemetry.latencySumMs += latency;
			telemetry.latencyCount++;

			return {
				ok: false,
				error: runtime.lastError,
			};
		}
	}
}
