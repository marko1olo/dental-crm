import { BotSessionRouter, TokenBucket } from "./omnichannel/botSessionRouter.js";
import { BotOutboundDelivery } from "./omnichannel/botOutboundDelivery.js";
import { BotWebhookDispatcher, type DispatchTelemetryStats } from "./omnichannel/botWebhookDispatcher.js";
import { OnlineBookingPlugin } from "./plugins/OnlineBookingPlugin.js";
import { PriceFaqPlugin } from "./plugins/PriceFaqPlugin.js";
import { ReviewCollectionPlugin } from "./plugins/ReviewCollectionPlugin.js";
import { ServiceReminderPlugin } from "./plugins/ServiceReminderPlugin.js";
import type {
	BotChannel,
	BotInboundMessage,
	BotPlugin,
	BotReply,
	OmnichannelBotRuntime,
} from "./types.js";

export { TokenBucket } from "./omnichannel/botSessionRouter.js";

/**
 * ВЫСОКОПЛОТНЫЙ МУЛЬТИТЕНАНТНЫЙ ДВИЖОК БОТОВ (OMNICHANNEL BOT ENGINE).
 * Тонкий фасад, объединяющий подсистемы сессий, доставки и диспетчеризации вебхуков.
 *
 * Архитектурные требования:
 * 1. 0 тяжелых процессов. 1 инстанс Fastify держит сотни ботов клиник.
 * 2. < 10 МБ RAM на одного бота (фактически < 500 КБ в V8 Heap).
 * 3. 200–300 ботов клиник легко живут на VPS с 1 ГБ RAM!
 * 4. Каналы связи: Telegram, VK Community, WhatsApp (Cloud & Green-API), Max Messenger.
 * 5. Мультитенантная изоляция: привязка к organizationId и строгий RLS.
 */
export class OmnichannelBotEngine {
	private readonly router = new BotSessionRouter();
	private readonly plugins: BotPlugin[] = [
		new ServiceReminderPlugin(),
		new OnlineBookingPlugin(),
		new PriceFaqPlugin(),
		new ReviewCollectionPlugin(),
	];

	private readonly telemetry: DispatchTelemetryStats = {
		totalUpdates: 0,
		totalRateLimited: 0,
		latencySumMs: 0,
		latencyCount: 0,
	};

	public registerPlugin(plugin: BotPlugin): void {
		this.plugins.unshift(plugin);
	}

	public isChatIntercepted(channel: BotChannel, organizationId: string, senderId: string): boolean {
		return this.router.isChatIntercepted(channel, organizationId, senderId);
	}

	public takeoverChat(
		channel: BotChannel,
		organizationId: string,
		senderId: string,
		operatorName = "Оператор",
	): { success: boolean; chatId: string; interceptedBy: string } {
		return this.router.takeoverChat(channel, organizationId, senderId, operatorName);
	}

	public releaseChat(
		channel: BotChannel,
		organizationId: string,
		senderId: string,
	): { success: boolean; chatId: string } {
		return this.router.releaseChat(channel, organizationId, senderId);
	}

	public getChatInterceptInfo(channel: BotChannel, organizationId: string, senderId: string): {
		isIntercepted: boolean;
		interceptedBy: string | null;
	} {
		return this.router.getChatInterceptInfo(channel, organizationId, senderId);
	}

	public listInterceptedChats(organizationId: string) {
		return this.router.listInterceptedChats(organizationId);
	}

	/**
	 * Отправка сообщения оператора пациенту с проверкой врачебной тайны и записью в БД.
	 */
	public async sendOperatorMessage(params: {
		channel: BotChannel;
		organizationId: string;
		senderId: string;
		message: string;
		operatorName?: string | undefined;
	}): Promise<{ ok: boolean; messageId?: string | null | undefined; error?: string | undefined }> {
		return await BotOutboundDelivery.sendOperatorMessage(params);
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
		return this.router.registerBot(params);
	}

	public unregisterBot(botId: string): boolean {
		return this.router.unregisterBot(botId);
	}

	public getBot(botId: string): OmnichannelBotRuntime | undefined {
		return this.router.getBot(botId);
	}

	public getBotByChannel(
		channel: BotChannel,
		organizationId: string,
		botConfigId = "default",
	): OmnichannelBotRuntime | undefined {
		return this.router.getBotByChannel(channel, organizationId, botConfigId);
	}

	public listBots(organizationId?: string): OmnichannelBotRuntime[] {
		return this.router.listBots(organizationId);
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
		return await BotWebhookDispatcher.dispatchInboundMessage({
			msg,
			sessionRouter: this.router,
			plugins: this.plugins,
			telemetry: this.telemetry,
		});
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
		return this.router.getEngineMetrics(this.telemetry);
	}
}

export const omnichannelBotEngine = new OmnichannelBotEngine();
