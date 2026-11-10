/**
 * Telegram Environment and Header Utilities
 * (DOMAIN: TELEGRAM API - LAYER 1 UTILS)
 */

export const telegramSecretHeader = "x-telegram-bot-api-secret-token";
export const denteAdminSecretHeader = "x-dente-admin-secret";
export const telegramLinkCodeRateLimitWindowMs = 10 * 60_000;
export const telegramLinkCodeRejectedAttemptLimit = 5;

export function normalizedTelegramBotUsername(
	value: string | null | undefined,
): string | null {
	const selected = value?.trim() || null;
	const normalized = selected?.replace(/^@/, "") ?? null;
	return normalized &&
		/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)
		? normalized
		: null;
}

export function trimmedEnv(name: string): string | null {
	return process.env[name]?.trim() || null;
}

export function stringFromEnvConfig(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function uuidFromEnvConfig(value: unknown): string | null {
	const candidate = stringFromEnvConfig(value);
	return candidate &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			candidate,
		)
		? candidate
		: null;
}
