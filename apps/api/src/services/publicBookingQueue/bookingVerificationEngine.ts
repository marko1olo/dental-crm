import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { bookingRateLimiter, type BookingRateLimiter } from "./bookingRateLimiter.js";
import {
	OTP_MAX_ATTEMPTS,
	OTP_TTL_MS,
	type OtpChallenge,
	normalizePhoneDigits,
} from "./types.js";

export class BookingVerificationEngine {
	private otpChallenges = new Map<string, OtpChallenge>();

	constructor(private rateLimiter: BookingRateLimiter = bookingRateLimiter) {}

	/**
	 * Rate limited OTP sender with cooldown (prevents bot abuse of clinic SMS balance).
	 */
	public requestPhoneVerification(
		phone: string,
		method: "sms" | "flash_call" = "sms",
		clientIp: string = "unknown",
		_organizationId?: string,
	): { allowed: boolean; message: string; cooldownSeconds?: number; challengeId?: string } {
		const cleanPhone = normalizePhoneDigits(phone);
		if (cleanPhone.length < 10) {
			return { allowed: false, message: "Некорректный номер телефона" };
		}

		const now = Date.now();

		// IP Rate limit: max 5 requests per 10 minutes
		const ipCheck = this.rateLimiter.checkAndRecordIp(clientIp, now);
		if (!ipCheck.allowed) {
			return {
				allowed: false,
				message: ipCheck.message || "Слишком много запросов с вашего IP-адреса. Подождите 10 минут.",
			};
		}

		// Phone cooldown & window check
		const existing = this.otpChallenges.get(cleanPhone);
		const phoneCheck = this.rateLimiter.checkAndRecordPhone(cleanPhone, existing, now);
		if (!phoneCheck.allowed) {
			return {
				allowed: false,
				message: phoneCheck.message || "Превышен лимит запросов кода",
				...(phoneCheck.cooldownSeconds !== undefined
					? { cooldownSeconds: phoneCheck.cooldownSeconds }
					: {}),
			};
		}

		const code = randomInt(100000, 1000000).toString();
		const challengeId = randomUUID();

		this.otpChallenges.set(cleanPhone, {
			phone: cleanPhone,
			code,
			expiresAt: now + OTP_TTL_MS,
			challengeId,
			lastSentAt: now,
			sendCountInWindow: existing ? existing.sendCountInWindow : 1,
			windowStart: existing ? existing.windowStart : now,
			failedAttempts: 0,
		});

		const message = method === "sms" ? "SMS-код успешно отправлен" : "Заказ звонка-сброса выполнен (введите 6 цифр)";
		return { allowed: true, message, cooldownSeconds: 60, challengeId };
	}

	public verifyPhoneOtp(phone: string, code: string): { valid: boolean; error?: string } {
		const cleanPhone = normalizePhoneDigits(phone);
		const trimmedCode = code.trim();

		// Dev/test bypass: strictly allowed ONLY when explicitly running in test or development environment
		const isDevOrTest =
			namedDevelopmentModeActive() ||
			process.env.NODE_ENV === "test" ||
			process.env.NODE_ENV === "development";
		if (
			isDevOrTest &&
			(trimmedCode === "0000" ||
				trimmedCode === "1234" ||
				trimmedCode === "000000" ||
				trimmedCode === "123456")
		) {
			return { valid: true };
		}

		const challenge = this.otpChallenges.get(cleanPhone);
		if (!challenge) {
			return { valid: false, error: "Код подтверждения не запрашивался или устарел" };
		}
		if (Date.now() > challenge.expiresAt) {
			this.otpChallenges.delete(cleanPhone);
			return { valid: false, error: "Срок действия кода подтверждения истёк" };
		}
		if (challenge.failedAttempts >= OTP_MAX_ATTEMPTS) {
			this.otpChallenges.delete(cleanPhone);
			return { valid: false, error: "Превышено максимальное число попыток ввода кода. Запросите новый код." };
		}

		const isMatch =
			Buffer.byteLength(challenge.code) === Buffer.byteLength(trimmedCode) &&
			timingSafeEqual(Buffer.from(challenge.code), Buffer.from(trimmedCode));

		if (!isMatch) {
			challenge.failedAttempts++;
			const remaining = Math.max(0, OTP_MAX_ATTEMPTS - challenge.failedAttempts);
			if (remaining === 0) {
				this.otpChallenges.delete(cleanPhone);
				return { valid: false, error: "Превышено максимальное число попыток ввода кода. Запросите новый код." };
			}
			return { valid: false, error: `Неверный код подтверждения. Осталось попыток: ${remaining}` };
		}

		this.otpChallenges.delete(cleanPhone);
		return { valid: true };
	}

	public clearChallenges(cleanPhone?: string): void {
		if (cleanPhone) {
			this.otpChallenges.delete(cleanPhone);
		} else {
			this.otpChallenges.clear();
		}
	}
}

export const bookingVerificationEngine = new BookingVerificationEngine();
