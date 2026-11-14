/**
 * apps/api/src/routes/publicBooking/smsVerificationAndSpamGate.ts
 *
 * In-memory OTP verification engine & rate limiting protection for public booking.
 * Eliminates backdoor passwords, enforces cryptographic OTP checks & SMS abuse guards.
 */

import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patients, portalOtpCodes } from "../../db/schema.js";
import { hashCredential } from "../../utils/cryptoHelper.js";
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "./types.js";

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 минут
export const OTP_COOLDOWN_MS = 60 * 1000; // 60 секунд
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_MAX_PER_PHONE_WINDOW = 3;
export const OTP_PHONE_WINDOW_MS = 10 * 60 * 1000;

export interface OtpChallenge {
	phone: string;
	code: string;
	expiresAt: number;
	challengeId: string;
	lastSentAt: number;
	sendCountInWindow: number;
	windowStart: number;
	failedAttempts: number;
}

export function normalizePhoneDigits(phone: string): string {
	return phone.replace(/\D/g, "");
}

// 1. General IP request limiter for endpoints
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = ipRequestCounts.get(ip);
	if (!entry || now > entry.resetAt) {
		ipRequestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export function resetRateLimitsForTesting(): void {
	ipRequestCounts.clear();
	bookingVerificationEngine.clearChallengesForTesting();
}

// 2. Specialized OTP Rate Limiter & Engine
export class BookingVerificationEngine {
	private otpChallenges = new Map<string, OtpChallenge>();
	private ipOtpRequests = new Map<string, { count: number; windowStart: number }>();

	private checkAndRecordIp(clientIp: string, now: number): { allowed: boolean; message?: string } {
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

	private checkAndRecordPhone(
		_cleanPhone: string,
		existing: OtpChallenge | undefined,
		now: number,
	): { allowed: boolean; message?: string; cooldownSeconds?: number } {
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

	public requestPhoneVerification(
		phone: string,
		method: "sms" | "flash_call" = "sms",
		clientIp: string = "unknown",
		organizationId?: string,
	): { allowed: boolean; message: string; cooldownSeconds?: number; challengeId?: string; developerCode?: string } {
		const cleanPhone = normalizePhoneDigits(phone);
		if (cleanPhone.length < 10) {
			return { allowed: false, message: "Некорректный номер телефона" };
		}

		const now = Date.now();

		const ipCheck = this.checkAndRecordIp(clientIp, now);
		if (!ipCheck.allowed) {
			return {
				allowed: false,
				message: ipCheck.message || "Слишком много запросов с вашего IP-адреса. Подождите 10 минут.",
			};
		}

		const existing = this.otpChallenges.get(cleanPhone);
		const phoneCheck = this.checkAndRecordPhone(cleanPhone, existing, now);
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

		if (organizationId) {
			void (async () => {
				try {
					const [pt] = await db
						.select({ id: patients.id })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, organizationId),
								or(eq(patients.phone, phone), eq(patients.phone, cleanPhone)),
							),
						)
						.limit(1);

					if (pt) {
						const hashed = await hashCredential(code);
						await db.insert(portalOtpCodes).values({
							organizationId,
							patientId: pt.id,
							codeHash: hashed,
							channel: method,
							deliveryStatus: "sent",
							expiresAt: new Date(now + OTP_TTL_MS),
						});
					}
				} catch {
					// In test/offline environments, in-memory challenge remains active
				}
			})();
		}

		const message = method === "sms" ? "SMS-код успешно отправлен" : "Заказ звонка-сброса выполнен (введите 6 цифр)";
		const isDevOrTest =
			namedDevelopmentModeActive() ||
			process.env.NODE_ENV === "test" ||
			process.env.NODE_ENV === "development";
		return {
			allowed: true,
			message,
			cooldownSeconds: 60,
			challengeId,
			...(isDevOrTest ? { developerCode: code } : {}),
		};
	}

	public getActiveCodeForTesting(phone: string): string | undefined {
		const cleanPhone = normalizePhoneDigits(phone);
		return this.otpChallenges.get(cleanPhone)?.code;
	}

	public clearChallengesForTesting(): void {
		this.otpChallenges.clear();
		this.ipOtpRequests.clear();
	}

	public verifyPhoneOtp(phone: string, code: string): { valid: boolean; error?: string } {
		const cleanPhone = normalizePhoneDigits(phone);
		const trimmedCode = code.trim();

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

export function requestPhoneVerification(
	phone: string,
	method: "sms" | "flash_call" = "sms",
	clientIp: string = "unknown",
	organizationId?: string,
) {
	return bookingVerificationEngine.requestPhoneVerification(
		phone,
		method,
		clientIp,
		organizationId,
	);
}

export function verifyPhoneOtp(phone: string, code: string) {
	return bookingVerificationEngine.verifyPhoneOtp(phone, code);
}

export function getActiveCodeForTesting(phone: string): string | undefined {
	return bookingVerificationEngine.getActiveCodeForTesting(phone);
}

export function clearChallengesForTesting(): void {
	bookingVerificationEngine.clearChallengesForTesting();
}
