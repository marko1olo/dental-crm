/**
 * whatsappRateLimiter.ts — Layer 1: Anti-Spam Rate Limiter & Meta WABA Service Window Regulator.
 *
 * Invariants:
 * - Anti-ban delay randomization between 15-40 seconds for mass messaging / campaign safety.
 * - Enforces Meta 24-hour customer service window (outside 24h requires approved WABA template).
 * - Tracks daily per-account and per-recipient limits to protect clinic phone number reputation.
 */

import type { WhatsAppRateLimitState } from "./types.js";

/**
 * Generates a randomized delay in milliseconds between minSec and maxSec (default: 15–40 seconds)
 * to emulate human messaging intervals and avoid automated spam pattern detection.
 */
export function getRandomAntiSpamDelayMs(minSec = 15, maxSec = 40): number {
	const minMs = Math.max(1, minSec) * 1000;
	const maxMs = Math.max(minSec, maxSec) * 1000;
	return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

/**
 * Asynchronously pauses execution for a randomized anti-spam interval.
 * Returns the actual elapsed delay in milliseconds.
 */
export async function sleepAntiSpamDelay(minSec = 15, maxSec = 40): Promise<number> {
	const delayMs = getRandomAntiSpamDelayMs(minSec, maxSec);
	await new Promise((resolve) => setTimeout(resolve, delayMs));
	return delayMs;
}

export interface RateLimitCheckResult {
	readonly allowed: boolean;
	readonly reason?: string;
	readonly retryAfterMs?: number;
	readonly isWithin24HourWindow?: boolean;
}

export class WhatsAppRateLimiter {
	// Organization ID -> Account state
	private readonly orgStates = new Map<string, WhatsAppRateLimitState>();
	// Phone -> timestamps of sent messages in milliseconds
	private readonly phoneHistory = new Map<string, number[]>();

	// Thresholds
	private readonly maxPerMinute = 10;
	private readonly maxPerHour = 100;
	private readonly maxDailyUntemplated = 250;

	/**
	 * Checks whether the recipient is within the Meta Cloud API 24-hour service window.
	 * Outside the 24h window from the last patient message, free-form text messages are rejected by Meta.
	 */
	public isWithin24HourWindow(lastInboundTimestamp?: string | Date | number): boolean {
		if (!lastInboundTimestamp) return false;
		const timeMs = new Date(lastInboundTimestamp).getTime();
		if (Number.isNaN(timeMs)) return false;
		return Date.now() - timeMs <= 24 * 60 * 60 * 1000;
	}

	/**
	 * Validates whether an outbound message can be sent right now without triggering spam bans.
	 */
	public checkCanSend(
		organizationId: string,
		phone: string,
		options: {
			isTemplate?: boolean;
			lastInboundTimestamp?: string | Date | number;
		} = {},
	): RateLimitCheckResult {
		const now = Date.now();
		const isWithinWindow = this.isWithin24HourWindow(options.lastInboundTimestamp);

		// If outside 24h window and not a pre-approved template, Meta WABA blocks free-form text
		if (!isWithinWindow && !options.isTemplate) {
			return {
				allowed: false,
				reason: "META_WABA_24H_WINDOW_EXPIRED: Outside 24-hour service window. Pre-approved template required.",
				isWithin24HourWindow: false,
			};
		}

		// Check organization account limits
		const orgState = this.getOrInitOrgState(organizationId);
		if (orgState.cooldownUntil && orgState.cooldownUntil > now) {
			return {
				allowed: false,
				reason: "ORG_RATE_LIMIT_COOLDOWN",
				retryAfterMs: orgState.cooldownUntil - now,
				isWithin24HourWindow: isWithinWindow,
			};
		}

		if (orgState.messagesSentToday >= this.maxDailyUntemplated && !options.isTemplate) {
			return {
				allowed: false,
				reason: "DAILY_CONVERSATION_QUOTA_REACHED: Daily limit of untemplated outbound messages reached.",
				isWithin24HourWindow: isWithinWindow,
			};
		}

		// Check per-phone flood protection (max 5 messages per 10 minutes to same phone)
		const cleanPhone = phone.replace(/\D/g, "");
		const timestamps = (this.phoneHistory.get(cleanPhone) || []).filter(
			(ts) => now - ts < 10 * 60 * 1000,
		);

		if (timestamps.length >= 5) {
			const oldest = timestamps[0] ?? now;
			const waitMs = 10 * 60 * 1000 - (now - oldest);
			return {
				allowed: false,
				reason: "RECIPIENT_THROTTLE: Maximum 5 messages per 10 minutes to the same recipient.",
				retryAfterMs: Math.max(1000, waitMs),
				isWithin24HourWindow: isWithinWindow,
			};
		}

		return {
			allowed: true,
			isWithin24HourWindow: isWithinWindow,
		};
	}

	/**
	 * Records a successful outbound message dispatch for rate-limiting calculations.
	 */
	public recordOutboundMessage(organizationId: string, phone: string): void {
		const now = Date.now();
		const cleanPhone = phone.replace(/\D/g, "");

		// Update phone history
		const timestamps = (this.phoneHistory.get(cleanPhone) || []).filter(
			(ts) => now - ts < 10 * 60 * 1000,
		);
		timestamps.push(now);
		this.phoneHistory.set(cleanPhone, timestamps);

		// Update organization state
		const org = this.getOrInitOrgState(organizationId);
		this.orgStates.set(organizationId, {
			organizationId,
			lastSentTimestamp: now,
			messagesSentLastHour: org.messagesSentLastHour + 1,
			messagesSentToday: org.messagesSentToday + 1,
		});
	}

	/**
	 * Applies a temporary cooldown backoff when a 429 Rate Limit error is returned by Meta Cloud API.
	 */
	public applyBackoff(organizationId: string, cooldownDurationSec = 60): void {
		const org = this.getOrInitOrgState(organizationId);
		this.orgStates.set(organizationId, {
			...org,
			cooldownUntil: Date.now() + cooldownDurationSec * 1000,
		});
	}

	private getOrInitOrgState(organizationId: string): WhatsAppRateLimitState {
		const existing = this.orgStates.get(organizationId);
		if (existing) {
			const isSameDay =
				new Date(existing.lastSentTimestamp).toDateString() ===
				new Date().toDateString();
			if (!isSameDay) {
				const reset: WhatsAppRateLimitState = {
					organizationId,
					lastSentTimestamp: Date.now(),
					messagesSentLastHour: 0,
					messagesSentToday: 0,
				};
				this.orgStates.set(organizationId, reset);
				return reset;
			}
			return existing;
		}

		const fresh: WhatsAppRateLimitState = {
			organizationId,
			lastSentTimestamp: Date.now(),
			messagesSentLastHour: 0,
			messagesSentToday: 0,
		};
		this.orgStates.set(organizationId, fresh);
		return fresh;
	}
}

export const defaultWhatsAppRateLimiter = new WhatsAppRateLimiter();
