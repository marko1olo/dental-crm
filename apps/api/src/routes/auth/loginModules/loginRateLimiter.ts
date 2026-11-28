/**
 * loginRateLimiter.ts
 *
 * Защита от перебора PIN-кода сотрудников (Brute-Force Protection).
 * Ограничение: максимум 5 неудачных попыток ввода PIN, затем блокировка на 5 минут (300 секунд).
 */

import { BoundedTtlMap } from "../../../lib/boundedTtlMap.js";

interface RateLimitEntry {
	failedAttempts: number;
	lockoutUntil: number;
	firstAttemptAt: number;
	lastAttemptAt: number;
}

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 минут (300 секунд)
const PIN_WINDOW_MS = 10 * 60 * 1000; // Окно сброса счётчика при отсутствии активности
export const MAX_PIN_RATE_LIMIT_ENTRIES = 5000; // Лимит записей в памяти для защиты от OOM

const pinRateLimitMap = new BoundedTtlMap<string, RateLimitEntry>({
	maxEntries: MAX_PIN_RATE_LIMIT_ENTRIES,
	ttlMs: PIN_WINDOW_MS,
});
let lastPeriodicCleanup = 0;
let cleanupIntervalTimer: NodeJS.Timeout | null = null;

function ensureCleanupTimer(): void {
	if (!cleanupIntervalTimer && typeof setInterval === "function") {
		const timer = setInterval(() => {
			cleanupExpiredPinRateLimits();
		}, 60_000);
		timer.unref();
		cleanupIntervalTimer = timer;
	}
}

export function stopPinRateLimiterCleanup(): void {
	if (cleanupIntervalTimer) {
		clearInterval(cleanupIntervalTimer);
		cleanupIntervalTimer = null;
	}
}

/**
 * Очистка устаревших записей rate limiter (Garbage Collection).
 */
export function cleanupExpiredPinRateLimits(currentTime?: number): number {
	const now = currentTime ?? Date.now();
	let evictedCount = pinRateLimitMap.pruneExpired(now);

	for (const [key, entry] of pinRateLimitMap.entries()) {
		if (entry.lockoutUntil > 0) {
			if (now > entry.lockoutUntil) {
				pinRateLimitMap.delete(key);
				evictedCount++;
			}
		} else if (now - entry.firstAttemptAt > PIN_WINDOW_MS) {
			pinRateLimitMap.delete(key);
			evictedCount++;
		}
	}

	// LRU eviction if size still exceeds MAX_PIN_RATE_LIMIT_ENTRIES
	while (pinRateLimitMap.size >= MAX_PIN_RATE_LIMIT_ENTRIES) {
		const oldestKey = pinRateLimitMap.keys()[0];
		if (oldestKey !== undefined) {
			pinRateLimitMap.delete(oldestKey);
			evictedCount++;
		} else {
			break;
		}
	}

	lastPeriodicCleanup = now;
	return evictedCount;
}

export function getStaffPinRateLimitKey(
	orgId: string,
	userIdOrIp?: string,
	ip?: string,
): string {
	// Мандат безопасности [SEC-04]: ключ учитывает orgId и IP терминала/клиента,
	// исключая обход rate limit через ротацию userId с одного IP.
	const effectiveIp = (ip || (userIdOrIp?.includes(".") || userIdOrIp?.includes(":") ? userIdOrIp : "unknown-ip")).trim();
	return `pin:${orgId}:${effectiveIp}`;
}

export interface PinRateLimitStatus {
	allowed: boolean;
	remainingAttempts: number;
	retryAfterSeconds?: number;
}

export function checkStaffPinRateLimit(key: string): PinRateLimitStatus {
	ensureCleanupTimer();
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
	ensureCleanupTimer();
	const now = Date.now();

	// Throttled lazy GC every 30s when map is non-empty
	if (now - lastPeriodicCleanup > 30_000 && pinRateLimitMap.size > 100) {
		cleanupExpiredPinRateLimits(now);
	}

	// Enforce LRU cap before insertion
	if (!pinRateLimitMap.has(key) && pinRateLimitMap.size >= MAX_PIN_RATE_LIMIT_ENTRIES) {
		cleanupExpiredPinRateLimits(now);
	}

	const entry = pinRateLimitMap.get(key);

	if (!entry || now - entry.firstAttemptAt > PIN_WINDOW_MS) {
		const newEntry: RateLimitEntry = {
			failedAttempts: 1,
			lockoutUntil: 0,
			firstAttemptAt: now,
			lastAttemptAt: now,
		};
		// Re-inserting updates LRU order in Map
		pinRateLimitMap.delete(key);
		pinRateLimitMap.set(key, newEntry);
		return {
			allowed: true,
			remainingAttempts: PIN_MAX_ATTEMPTS - 1,
		};
	}

	entry.failedAttempts += 1;
	entry.lastAttemptAt = now;

	// Re-insert to refresh LRU order
	pinRateLimitMap.delete(key);
	pinRateLimitMap.set(key, entry);

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
	if (cleanupIntervalTimer) {
		clearInterval(cleanupIntervalTimer);
		cleanupIntervalTimer = null;
	}
}

export function getPinRateLimitMapSizeForTesting(): number {
	return pinRateLimitMap.size;
}
