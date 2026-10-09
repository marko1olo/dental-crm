import type { RateLimitConfig, RateLimitStatus } from "./types.js";

/**
 * Ограничитель частоты отправки сообщений в Telegram Bot API (Layer 2).
 * Стандарты Telegram:
 * - Не более 30 сообщений в секунду суммарно от одного бота
 * - Не более 1 сообщения в секунду в один приватный чат или группу
 * - Экспоненциальный backoff и уважение заголовка/поля parameters.retry_after при 429 Too Many Requests
 */
export class TelegramRateLimiter {
	private static defaultConfig: RateLimitConfig = {
		maxMessagesPerSecond: 30,
		maxMessagesPerChatPerSecond: 1,
		burstWindowMs: 1000,
		retryAfterSafetyMarginMs: 250,
	};

	// История временных меток отправки по ботам (timestamp ms)
	private static globalTimestamps = new Map<string, number[]>();

	// История временных меток отправки по связкам bot:chat (timestamp ms)
	private static chatTimestamps = new Map<string, number[]>();

	// Заблокированные до определенного времени боты или чаты из-за 429
	private static cooldownUntil = new Map<string, number>();

	private static makeChatKey(botToken: string, chatId: string | number): string {
		const tokenPrefix = botToken.slice(0, 10);
		return `${tokenPrefix}:${chatId}`;
	}

	private static makeBotKey(botToken: string): string {
		return botToken.slice(0, 10);
	}

	/**
	 * Проверка возможности отправки сообщения прямо сейчас
	 */
	static checkLimit(
		botToken: string,
		chatId: string | number,
		config: Partial<RateLimitConfig> = {},
	): RateLimitStatus {
		const cfg: RateLimitConfig = { ...this.defaultConfig, ...config };
		const now = Date.now();
		const botKey = this.makeBotKey(botToken);
		const chatKey = this.makeChatKey(botToken, chatId);

		// 1. Проверяем наличие активного cooldown (429)
		const botCooldown = this.cooldownUntil.get(botKey) ?? 0;
		if (botCooldown > now) {
			return {
				allowed: false,
				retryAfterMs: botCooldown - now,
				currentQueueLength: 0,
			};
		}

		const chatCooldown = this.cooldownUntil.get(chatKey) ?? 0;
		if (chatCooldown > now) {
			return {
				allowed: false,
				retryAfterMs: chatCooldown - now,
				currentQueueLength: 0,
			};
		}

		// 2. Проверяем глобальный лимит сообщений бота (скользящее окно 1000 мс)
		const botHistory = (this.globalTimestamps.get(botKey) ?? []).filter(
			(t) => now - t < cfg.burstWindowMs,
		);
		this.globalTimestamps.set(botKey, botHistory);

		if (botHistory.length >= cfg.maxMessagesPerSecond) {
			const oldestInWindow = botHistory[0] ?? now;
			const waitMs = cfg.burstWindowMs - (now - oldestInWindow);
			return {
				allowed: false,
				retryAfterMs: Math.max(waitMs, 50),
				currentQueueLength: botHistory.length,
			};
		}

		// 3. Проверяем лимит на конкретный чат (скользящее окно 1000 мс)
		const chatHistory = (this.chatTimestamps.get(chatKey) ?? []).filter(
			(t) => now - t < cfg.burstWindowMs,
		);
		this.chatTimestamps.set(chatKey, chatHistory);

		if (chatHistory.length >= cfg.maxMessagesPerChatPerSecond) {
			const oldestInWindow = chatHistory[0] ?? now;
			const waitMs = cfg.burstWindowMs - (now - oldestInWindow);
			return {
				allowed: false,
				retryAfterMs: Math.max(waitMs, 100),
				currentQueueLength: chatHistory.length,
			};
		}

		return {
			allowed: true,
			retryAfterMs: 0,
			currentQueueLength: 0,
		};
	}

	/**
	 * Фиксация факта отправки сообщения
	 */
	static recordDispatch(botToken: string, chatId: string | number): void {
		const now = Date.now();
		const botKey = this.makeBotKey(botToken);
		const chatKey = this.makeChatKey(botToken, chatId);

		const botHistory = this.globalTimestamps.get(botKey) ?? [];
		botHistory.push(now);
		this.globalTimestamps.set(botKey, botHistory);

		const chatHistory = this.chatTimestamps.get(chatKey) ?? [];
		chatHistory.push(now);
		this.chatTimestamps.set(chatKey, chatHistory);
	}

	/**
	 * Установка принудительного кулдауна при получении ошибки 429 Too Many Requests
	 */
	static handle429Response(
		botToken: string,
		chatId: string | number | undefined,
		retryAfterSeconds: number,
	): void {
		const marginMs = this.defaultConfig.retryAfterSafetyMarginMs;
		const durationMs = Math.max(retryAfterSeconds * 1000 + marginMs, 1000);
		const cooldownTarget = Date.now() + durationMs;

		if (chatId !== undefined) {
			const chatKey = this.makeChatKey(botToken, chatId);
			this.cooldownUntil.set(chatKey, cooldownTarget);
		} else {
			const botKey = this.makeBotKey(botToken);
			this.cooldownUntil.set(botKey, cooldownTarget);
		}
	}

	/**
	 * Очистка истории (для тестов)
	 */
	static reset(): void {
		this.globalTimestamps.clear();
		this.chatTimestamps.clear();
		this.cooldownUntil.clear();
	}
}
