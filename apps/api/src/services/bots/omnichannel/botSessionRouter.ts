import crypto from "node:crypto";
import { BoundedTtlMap } from "../../../lib/boundedTtlMap.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { wsBroker } from "../../websocketBroker.js";
import { ChatLockService } from "../../communications/ChatLockService.js";
import type {
	BotChannel,
	OmnichannelBotRuntime,
} from "../types.js";

const botRouterLogger = createApiLogger("botSessionRouter");

/**
 * Token Bucket алгоритм для защиты от флуда и соблюдения лимитов Bot API.
 */
export class TokenBucket {
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

export interface InterceptedChatEntry {
	interceptedAt: Date;
	operatorName: string;
	expiresAt?: Date | undefined;
}

export interface InterceptedChatPublic {
	channel: BotChannel;
	senderId: string;
	interceptedBy: string;
	interceptedAt: Date;
}

/**
 * Управление сессиями ботов, рантаймами в памяти и перехватом чатов оператором клиники.
 */
export class BotSessionRouter {
	private readonly runtimes = new BoundedTtlMap<string, OmnichannelBotRuntime>({
		maxEntries: 2000,
		touchOnGet: false,
	});
	private readonly rateLimiters = new BoundedTtlMap<string, TokenBucket>({
		maxEntries: 2000,
		ttlMs: 24 * 60 * 60_000,
	});
	private readonly interceptedChats = new BoundedTtlMap<string, InterceptedChatEntry>({
		maxEntries: 5000,
		ttlMs: 60 * 60_000,
	});

	public isChatIntercepted(channel: BotChannel, organizationId: string, senderId: string): boolean {
		const key = `${channel}:${organizationId}:${senderId}`;
		const entry = this.interceptedChats.get(key);
		if (!entry) return false;
		if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) {
			this.interceptedChats.delete(key);
			return false;
		}
		return true;
	}

	public async isChatInterceptedAsync(
		channel: BotChannel,
		organizationId: string,
		senderId: string,
	): Promise<boolean> {
		if (this.isChatIntercepted(channel, organizationId, senderId)) {
			return true;
		}
		try {
			const status = await ChatLockService.getLockStatus({
				organizationId,
				chatId: `${channel}:${senderId}`,
			});
			if (status.isLocked && status.lockedByAgent) {
				const key = `${channel}:${organizationId}:${senderId}`;
				this.interceptedChats.set(key, {
					interceptedAt: status.lockAcquiredAt ? new Date(status.lockAcquiredAt) : new Date(),
					operatorName: status.lockedByAgent,
					expiresAt: status.lockExpiresAt ? new Date(status.lockExpiresAt) : new Date(Date.now() + 60 * 1000),
				});
				return true;
			}
		} catch (err) {
			botRouterLogger.debug(
				{ err: safeLogError(err), channel, organizationId, senderId },
				"ChatLockService lookup failed; falling back to local intercept cache",
			);
		}
		return false;
	}

	public takeoverChat(
		channel: BotChannel,
		organizationId: string,
		senderId: string,
		operatorName = "Оператор",
	): { success: boolean; chatId: string; interceptedBy: string } {
		const key = `${channel}:${organizationId}:${senderId}`;
		const chatId = `${channel}:${senderId}`;
		this.interceptedChats.set(key, {
			interceptedAt: new Date(),
			operatorName,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour takeover
		});

		// Персистентный захват в PostgreSQL collaborative_chat_processing_states + pg_advisory_xact_lock
		void ChatLockService.acquireLock({
			organizationId,
			chatId,
			agentName: operatorName,
			durationMinutes: 60,
		}).catch((err) => {
			botRouterLogger.debug(
				{ err: safeLogError(err), channel, organizationId, senderId },
				"Async ChatLockService.acquireLock failed; in-memory takeover active",
			);
		});

		wsBroker.broadcastToOrganization(organizationId, {
			type: "INBOX_CHAT_TAKEOVER",
			payload: { channel, senderId, interceptedBy: operatorName },
		});

		return { success: true, chatId: key, interceptedBy: operatorName };
	}

	public releaseChat(
		channel: BotChannel,
		organizationId: string,
		senderId: string,
	): { success: boolean; chatId: string } {
		const key = `${channel}:${organizationId}:${senderId}`;
		const chatId = `${channel}:${senderId}`;
		this.interceptedChats.delete(key);

		// Персистентное снятие блокировки в PostgreSQL
		void ChatLockService.releaseLock({
			organizationId,
			chatId,
			force: true,
		}).catch((err) => {
			botRouterLogger.debug(
				{ err: safeLogError(err), channel, organizationId, senderId },
				"Async ChatLockService.releaseLock failed",
			);
		});

		wsBroker.broadcastToOrganization(organizationId, {
			type: "INBOX_CHAT_RELEASED",
			payload: { channel, senderId },
		});

		return { success: true, chatId: key };
	}

	public getChatInterceptInfo(channel: BotChannel, organizationId: string, senderId: string): {
		isIntercepted: boolean;
		interceptedBy: string | null;
	} {
		const key = `${channel}:${organizationId}:${senderId}`;
		const entry = this.interceptedChats.get(key);
		if (!entry) return { isIntercepted: false, interceptedBy: null };
		if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) {
			this.interceptedChats.delete(key);
			return { isIntercepted: false, interceptedBy: null };
		}
		return { isIntercepted: true, interceptedBy: entry.operatorName };
	}

	public listInterceptedChats(organizationId: string): InterceptedChatPublic[] {
		const result: InterceptedChatPublic[] = [];
		const now = Date.now();
		for (const [key, entry] of this.interceptedChats.entries()) {
			if (entry.expiresAt && entry.expiresAt.getTime() < now) {
				this.interceptedChats.delete(key);
				continue;
			}
			const parts = key.split(":");
			if (parts.length >= 3 && parts[1] === organizationId) {
				result.push({
					channel: parts[0] as BotChannel,
					senderId: parts.slice(2).join(":"),
					interceptedBy: entry.operatorName,
					interceptedAt: entry.interceptedAt,
				});
			}
		}
		return result;
	}

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

	public getBotByChannel(
		channel: BotChannel,
		organizationId: string,
		botConfigId = "default",
	): OmnichannelBotRuntime | undefined {
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

	public getRateLimiter(botId: string): TokenBucket {
		let bucket = this.rateLimiters.get(botId);
		if (!bucket) {
			bucket = new TokenBucket(30, 40);
			this.rateLimiters.set(botId, bucket);
		}
		return bucket;
	}

	public getEngineMetrics(totals: {
		totalUpdates: number;
		totalRateLimited: number;
		latencySumMs: number;
		latencyCount: number;
	}): {
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

		const avgLat = totals.latencyCount > 0
			? Number((totals.latencySumMs / totals.latencyCount).toFixed(2))
			: 0;
		const estimatedMemoryKb = Math.round(bots.length * 2.5);

		return {
			totalBotsRegistered: bots.length,
			activeBotsCount: activeCount,
			channelDistribution: channelCount,
			totalUpdatesProcessed: totals.totalUpdates,
			totalRateLimited: totals.totalRateLimited,
			avgLatencyMs: avgLat,
			estimatedMemoryKb,
		};
	}
}
