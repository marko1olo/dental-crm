import {
	OTP_COOLDOWN_MS,
	OTP_MAX_PER_PHONE_WINDOW,
	OTP_PHONE_WINDOW_MS,
	type OtpChallenge,
} from "./types.js";

export interface RateLimitCheckResult {
	allowed: boolean;
	message?: string;
	cooldownSeconds?: number;
}

export class BookingRateLimiter {
	private ipOtpRequests = new Map<string, { count: number; windowStart: number }>();

	/**
	 * Validates IP rate limit: max 5 requests per 10 minutes.
	 */
	public checkAndRecordIp(clientIp: string, now: number): RateLimitCheckResult {
		const ipEntry = this.ipOtpRequests.get(clientIp);
		if (ipEntry) {
			if (now - ipEntry.windowStart > OTP_PHONE_WINDOW_MS) {
				this.ipOtpRequests.set(clientIp, { count: 1, windowStart: now });
			} else if (ipEntry.count >= 5) {
				return {
					allowed: false,
					message: "Слишком много запросов с вашего IP-адреса. Подождите 10 минут.",
				};
			} else {
				ipEntry.count++;
			}
		} else {
			this.ipOtpRequests.set(clientIp, { count: 1, windowStart: now });
		}
		return { allowed: true };
	}

	/**
	 * Validates Phone rate limit & cooldown: 60s cooldown, max 3 in 10-minute sliding window.
	 */
	public checkAndRecordPhone(
		_cleanPhone: string,
		existing: OtpChallenge | undefined,
		now: number,
	): RateLimitCheckResult {
		if (existing) {
			if (now - existing.lastSentAt < OTP_COOLDOWN_MS) {
				const remaining = Math.ceil((OTP_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
				return {
					allowed: false,
					message: `Повторная отправка кода возможна через ${remaining} сек.`,
					cooldownSeconds: remaining,
				};
			}
			if (now - existing.windowStart > OTP_PHONE_WINDOW_MS) {
				existing.windowStart = now;
				existing.sendCountInWindow = 1;
			} else if (existing.sendCountInWindow >= OTP_MAX_PER_PHONE_WINDOW) {
				return {
					allowed: false,
					message: "Превышен лимит запросов кода на этот номер (максимум 3 за 10 мин). Повторите позже.",
				};
			} else {
				existing.sendCountInWindow++;
			}
			existing.lastSentAt = now;
		}
		return { allowed: true };
	}

	public clearRateLimits(): void {
		this.ipOtpRequests.clear();
	}
}

export const bookingRateLimiter = new BookingRateLimiter();
