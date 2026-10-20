/**
 * loginRateLimiter.ts
 *
 * Защита от перебора PIN-кода сотрудников (Brute-Force Protection).
 * Ограничение: максимум 5 неудачных попыток ввода PIN, затем блокировка на 5 минут (300 секунд).
 */

interface RateLimitEntry {
	failedAttempts: number;
	lockoutUntil: number;
	firstAttemptAt: number;
}

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 минут (300 секунд)
const PIN_WINDOW_MS = 10 * 60 * 1000; // Окно сброса счётчика при отсутствии активности

const pinRateLimitMap = new Map<string, RateLimitEntry>();

export function getStaffPinRateLimitKey(
	orgId: string,
	userId: string,
	ip?: string,
): string {
	const sanitizedIp = ip ? ip.trim() : "unknown-ip";
	return `pin:${orgId}:${userId}:${sanitizedIp}`;
}

export interface PinRateLimitStatus {
	allowed: boolean;
	remainingAttempts: number;
	retryAfterSeconds?: number;
}

export function checkStaffPinRateLimit(key: string): PinRateLimitStatus {
	const now = Date.now();
	const entry = pinRateLimitMap.get(key);

	if (!entry) {
		return { allowed: true, remainingAttempts: PIN_MAX_ATTEMPTS };
	}

	// Если время блокировки ещё не истекло
	if (entry.lockoutUntil > now) {
		const retryAfterSeconds = Math.max(
			1,
			Math.ceil((entry.lockoutUntil - now) / 1000),
		);
		return {
			allowed: false,
			remainingAttempts: 0,
			retryAfterSeconds,
		};
	}

	// Если окно устарело — очищаем
	if (now - entry.firstAttemptAt > PIN_WINDOW_MS) {
		pinRateLimitMap.delete(key);
		return { allowed: true, remainingAttempts: PIN_MAX_ATTEMPTS };
	}

	const remaining = Math.max(0, PIN_MAX_ATTEMPTS - entry.failedAttempts);
	return {
		allowed: true,
		remainingAttempts: remaining,
	};
}

export function recordStaffPinFailure(key: string): PinRateLimitStatus {
	const now = Date.now();
	const entry = pinRateLimitMap.get(key);

	if (!entry || now - entry.firstAttemptAt > PIN_WINDOW_MS) {
		const newEntry: RateLimitEntry = {
			failedAttempts: 1,
			lockoutUntil: 0,
			firstAttemptAt: now,
		};
		pinRateLimitMap.set(key, newEntry);
		return {
			allowed: true,
			remainingAttempts: PIN_MAX_ATTEMPTS - 1,
		};
	}

	entry.failedAttempts += 1;

	if (entry.failedAttempts >= PIN_MAX_ATTEMPTS) {
		entry.lockoutUntil = now + PIN_LOCKOUT_MS;
		const retryAfterSeconds = Math.ceil(PIN_LOCKOUT_MS / 1000);
		return {
			allowed: false,
			remainingAttempts: 0,
			retryAfterSeconds,
		};
	}

	return {
		allowed: true,
		remainingAttempts: PIN_MAX_ATTEMPTS - entry.failedAttempts,
	};
}

export function resetStaffPinRateLimit(key: string): void {
	pinRateLimitMap.delete(key);
}

// Экспорт для unit-тестов
export function clearAllStaffPinRateLimitsForTesting(): void {
	pinRateLimitMap.clear();
}
