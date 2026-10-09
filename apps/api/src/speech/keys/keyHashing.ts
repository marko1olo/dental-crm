import { createHash } from "node:crypto";
import { resolve } from "node:path";
import type { KeyHealth } from "./types.js";

export function numberFromEnv(name: string, fallback: number): number {
	const value = Number(process.env[name]);
	return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function speechProviderTimeoutMs(): number {
	return numberFromEnv("DENTAL_SPEECH_PROVIDER_TIMEOUT_MS", 45_000);
}

export function rateLimitCooldownMs(): number {
	return numberFromEnv("DENTAL_SPEECH_RATE_LIMIT_COOLDOWN_MS", 60_000);
}

export function errorCooldownMs(): number {
	return numberFromEnv("DENTAL_SPEECH_ERROR_COOLDOWN_MS", 30_000);
}

export function authCooldownMs(): number {
	return numberFromEnv("DENTAL_SPEECH_AUTH_COOLDOWN_MS", 600_000);
}

export function maxNumberedKeys(): number {
	return Math.max(
		1,
		Math.min(numberFromEnv("DENTAL_SPEECH_MAX_NUMBERED_KEYS", 20), 100),
	);
}

export function splitKeyList(value: string | undefined): string[] {
	if (!value?.trim()) return [];
	return value
		.split(/[\n\r,;]+/)
		.map((item) => item.trim().replace(/^["']|["']$/g, ""))
		.filter(Boolean);
}

export function fingerprintSecret(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function keyHealthFilePath(): string | null {
	const configured = process.env.DENTAL_SPEECH_KEY_HEALTH_FILE?.trim();
	if (configured && configured.toLowerCase() === "off") return null;
	return resolve(configured || ".data/speech-key-health.json");
}

export function keyHealthTtlMs(): number {
	return numberFromEnv(
		"DENTAL_SPEECH_KEY_HEALTH_TTL_MS",
		30 * 24 * 60 * 60 * 1000,
	);
}

export function isPersistedHealthKey(value: string): boolean {
	return /^[a-z0-9_]+:[a-f0-9]{12}$/i.test(value);
}

export function sanitizeProviderErrorMessage(message: string): string {
	return message
		.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
		.replace(/Token\s+[A-Za-z0-9._-]+/gi, "Token [redacted]")
		.replace(
			/Authorization\s*:\s*[^\s,;]+(?:\s+[^\s,;]+)?/gi,
			"Authorization: [redacted]",
		)
		.replace(
			/([?&](?:api[_-]?key|key|token|access[_-]?token)=)[^&\s]+/gi,
			"$1[redacted]",
		)
		.replace(
			/\b(api[_-]?key|token|secret|password)\s*[:=]\s*[A-Za-z0-9._~+/-]{12,}/gi,
			"$1=[redacted]",
		)
		.replace(/sk-[A-Za-z0-9_-]{16,}/g, "sk-[redacted]")
		.replace(/[A-Za-z0-9_-]{48,}/g, "[redacted]")
		.slice(0, 240);
}

export function normalizePersistedHealth(value: unknown): KeyHealth | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<KeyHealth>;
	const cooldownUntil = Number(candidate.cooldownUntil ?? 0);
	const failures = Number(candidate.failures ?? 0);
	const consecutiveFailures = Number(
		candidate.consecutiveFailures ?? candidate.failures ?? 0,
	);
	const successes = Number(candidate.successes ?? 0);
	const lastUsedAt =
		candidate.lastUsedAt === null || candidate.lastUsedAt === undefined
			? null
			: Number(candidate.lastUsedAt);
	const lastStatusCode =
		candidate.lastStatusCode === null || candidate.lastStatusCode === undefined
			? null
			: Number(candidate.lastStatusCode);
	if (
		!Number.isFinite(cooldownUntil) ||
		!Number.isFinite(failures) ||
		!Number.isFinite(consecutiveFailures) ||
		!Number.isFinite(successes)
	)
		return null;
	if (lastUsedAt !== null && !Number.isFinite(lastUsedAt)) return null;
	if (lastStatusCode !== null && !Number.isFinite(lastStatusCode)) return null;
	return {
		cooldownUntil: Math.max(0, Math.floor(cooldownUntil)),
		failures: Math.max(0, Math.floor(failures)),
		consecutiveFailures: Math.max(0, Math.floor(consecutiveFailures)),
		successes: Math.max(0, Math.floor(successes)),
		lastUsedAt:
			lastUsedAt === null ? null : Math.max(0, Math.floor(lastUsedAt)),
		lastStatusCode:
			lastStatusCode === null ? null : Math.max(0, Math.floor(lastStatusCode)),
		lastError: candidate.lastError
			? sanitizeProviderErrorMessage(String(candidate.lastError))
			: null,
	};
}

export function modelHealthFilePath(): string | null {
	const configured = process.env.DENTAL_MODEL_HEALTH_FILE?.trim();
	if (configured && configured.toLowerCase() === "off") return null;
	return resolve(configured || ".data/model-health.json");
}
