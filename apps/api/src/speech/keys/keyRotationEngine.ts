import { randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
	KeyHealth,
	KeyPoolProviderId,
	KeySelectionMode,
	PersistedKeyHealthFile,
	ProviderKeySpec,
	SpeechProviderKeyCandidate,
	SpeechProviderKeyHealthSnapshot,
	SpeechProviderKeyPoolSummary,
} from "./types.js";
import { SpeechProviderRequestError } from "./proxyAndTunnel.js";
import { clearModelHealthMemoryForTests } from "./modelHealthEngine.js";
import {
	authCooldownMs,
	errorCooldownMs,
	fingerprintSecret,
	isPersistedHealthKey,
	keyHealthFilePath,
	keyHealthTtlMs,
	maxNumberedKeys,
	normalizePersistedHealth,
	numberFromEnv,
	rateLimitCooldownMs,
	sanitizeProviderErrorMessage,
	speechProviderTimeoutMs,
	splitKeyList,
} from "./keyHashing.js";

const keyHealthByFingerprint = new Map<string, KeyHealth>();
let keyHealthLoadedFromDisk = false;

export function clearSpeechKeyHealthMemoryForTests(): void {
	keyHealthByFingerprint.clear();
	roundRobinIndexByProvider.clear();
	keyHealthLoadedFromDisk = true;
	const filePath = keyHealthFilePath();
	if (filePath && existsSync(filePath)) {
		try {
			unlinkSync(filePath);
		} catch {}
	}
	clearModelHealthMemoryForTests();
}

const providerKeySpecs: Record<string, ProviderKeySpec> = {
	none: { singles: [], lists: [], numberedBases: [] },
	browser_speech: { singles: [], lists: [], numberedBases: [] },
	groq_whisper: {
		singles: ["GROQ_API_KEY"],
		lists: ["GROQ_API_KEYS"],
		numberedBases: ["GROQ_API_KEY"],
	},
	groq: {
		singles: ["GROQ_API_KEY"],
		lists: ["GROQ_API_KEYS"],
		numberedBases: ["GROQ_API_KEY"],
	},
	openai_transcribe: {
		singles: ["OPENAI_API_KEY"],
		lists: ["OPENAI_API_KEYS"],
		numberedBases: ["OPENAI_API_KEY"],
	},
	openai: {
		singles: ["OPENAI_API_KEY"],
		lists: ["OPENAI_API_KEYS"],
		numberedBases: ["OPENAI_API_KEY"],
	},
	deepgram_streaming: {
		singles: ["DEEPGRAM_API_KEY"],
		lists: ["DEEPGRAM_API_KEYS"],
		numberedBases: ["DEEPGRAM_API_KEY"],
	},
	assemblyai_async: {
		singles: ["ASSEMBLYAI_API_KEY"],
		lists: ["ASSEMBLYAI_API_KEYS"],
		numberedBases: ["ASSEMBLYAI_API_KEY"],
	},
	cloudflare_whisper: {
		singles: ["CLOUDFLARE_API_TOKEN"],
		lists: ["CLOUDFLARE_API_TOKENS"],
		numberedBases: ["CLOUDFLARE_API_TOKEN"],
	},
	azure_speech: {
		singles: ["AZURE_SPEECH_KEY"],
		lists: ["AZURE_SPEECH_KEYS"],
		numberedBases: ["AZURE_SPEECH_KEY"],
	},
	google_speech: {
		singles: [
			"GOOGLE_APPLICATION_CREDENTIALS",
			"GOOGLE_API_KEY",
			"GEMINI_API_KEY",
		],
		lists: ["GOOGLE_API_KEYS", "GEMINI_API_KEYS"],
		numberedBases: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
	},
	gemini_transcribe_live: {
		singles: [
			"GEMINI_API_KEY",
			"GOOGLE_API_KEY",
			"GOOGLE_APPLICATION_CREDENTIALS",
		],
		lists: ["GEMINI_API_KEYS", "GOOGLE_API_KEYS"],
		numberedBases: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
	},
	gemini: {
		singles: [
			"GEMINI_API_KEY",
			"GOOGLE_API_KEY",
			"GOOGLE_APPLICATION_CREDENTIALS",
		],
		lists: ["GEMINI_API_KEYS", "GOOGLE_API_KEYS"],
		numberedBases: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
	},
	deepseek: {
		singles: ["DEEPSEEK_API_KEY"],
		lists: ["DEEPSEEK_API_KEYS"],
		numberedBases: ["DEEPSEEK_API_KEY"],
	},
	anthropic: {
		singles: ["ANTHROPIC_API_KEY"],
		lists: ["ANTHROPIC_API_KEYS"],
		numberedBases: ["ANTHROPIC_API_KEY"],
	},
	huggingface_asr: {
		singles: ["HUGGINGFACE_API_TOKEN", "HF_TOKEN"],
		lists: ["HUGGINGFACE_API_TOKENS", "HF_TOKENS"],
		numberedBases: ["HUGGINGFACE_API_TOKEN", "HF_TOKEN"],
	},
	mobile_native_speech: { singles: [], lists: [], numberedBases: [] },
	local_whisper: { singles: [], lists: [], numberedBases: [] },
	vosk_local: { singles: [], lists: [], numberedBases: [] },
};

function getSpecForProvider(providerId: KeyPoolProviderId): ProviderKeySpec {
	if (providerKeySpecs[providerId]) {
		return providerKeySpecs[providerId];
	}
	const upper = String(providerId).toUpperCase();
	return {
		singles: [`${upper}_API_KEY`],
		lists: [`${upper}_API_KEYS`],
		numberedBases: [`${upper}_API_KEY`],
	};
}

function pruneKeyHealth(now = Date.now()): void {
	const ttlMs = keyHealthTtlMs();
	for (const [key, health] of keyHealthByFingerprint.entries()) {
		const lastUsedAt = health.lastUsedAt ?? 0;
		if (
			health.cooldownUntil <= now &&
			lastUsedAt > 0 &&
			now - lastUsedAt > ttlMs
		) {
			keyHealthByFingerprint.delete(key);
		}
	}
}

function loadKeyHealthFromDisk(): void {
	if (keyHealthLoadedFromDisk) return;
	keyHealthLoadedFromDisk = true;
	const filePath = keyHealthFilePath();
	if (!filePath || !existsSync(filePath)) return;
	try {
		const parsed = JSON.parse(
			readFileSync(filePath, "utf8"),
		) as Partial<PersistedKeyHealthFile>;
		const health =
			parsed.health && typeof parsed.health === "object" ? parsed.health : {};
		for (const [key, value] of Object.entries(health)) {
			if (!isPersistedHealthKey(key)) continue;
			const normalized = normalizePersistedHealth(value);
			if (normalized) keyHealthByFingerprint.set(key, normalized);
		}
		pruneKeyHealth();
	} catch {
		keyHealthByFingerprint.clear();
	}
}

function saveKeyHealthToDisk(): void {
	loadKeyHealthFromDisk();
	const filePath = keyHealthFilePath();
	if (!filePath) return;
	try {
		pruneKeyHealth();
		mkdirSync(dirname(filePath), { recursive: true });
		const payload: PersistedKeyHealthFile = {
			version: 1,
			savedAt: new Date().toISOString(),
			health: Object.fromEntries(
				[...keyHealthByFingerprint.entries()].sort(([left], [right]) =>
					left.localeCompare(right),
				),
			),
		};
		writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	} catch {
		// Key cooldown persistence is a safety cache; request handling must keep working if disk is read-only.
	}
}

function healthKey(
	providerId: KeyPoolProviderId,
	candidate: Pick<SpeechProviderKeyCandidate, "fingerprint">,
): string {
	return `${providerId}:${candidate.fingerprint}`;
}

function healthFor(
	providerId: KeyPoolProviderId,
	candidate: Pick<SpeechProviderKeyCandidate, "fingerprint">,
): KeyHealth {
	loadKeyHealthFromDisk();
	return (
		keyHealthByFingerprint.get(healthKey(providerId, candidate)) ?? {
			cooldownUntil: 0,
			failures: 0,
			consecutiveFailures: 0,
			successes: 0,
			lastUsedAt: null,
			lastStatusCode: null,
			lastError: null,
		}
	);
}

function isLikelyTransientProviderError(error: unknown): boolean {
	const message = sanitizeProviderErrorMessage(
		error instanceof Error ? error.message : String(error ?? ""),
	).toLowerCase();
	return /fetch failed|network|econnreset|econnrefused|etimedout|timeout|socket|terminated|temporar|dns|enotfound/.test(
		message,
	);
}

export function getProviderKeyCandidates(
	providerId: KeyPoolProviderId,
): SpeechProviderKeyCandidate[] {
	const spec = getSpecForProvider(providerId);
	const values: Array<{ value: string; source: string }> = [];

	for (const envName of spec.lists) {
		splitKeyList(process.env[envName]).forEach((value, index) => {
			values.push({ value, source: `${envName}[${index + 1}]` });
		});
	}

	for (const baseName of spec.numberedBases) {
		for (let index = 1; index <= maxNumberedKeys(); index += 1) {
			const value = process.env[`${baseName}_${index}`]?.trim();
			if (value) values.push({ value, source: `${baseName}_${index}` });
		}
	}

	for (const envName of spec.singles) {
		const value = process.env[envName]?.trim();
		if (value) values.push({ value, source: envName });
	}

	const seen = new Set<string>();
	return values
		.filter((candidate) => {
			if (seen.has(candidate.value)) return false;
			seen.add(candidate.value);
			return true;
		})
		.map((candidate, index) => ({
			...candidate,
			fingerprint: fingerprintSecret(candidate.value),
			ordinal: index + 1,
		}));
}

export function getProviderAcceptedKeyEnvVars(
	providerId: KeyPoolProviderId,
): string[] {
	const spec = getSpecForProvider(providerId);
	return [
		...spec.lists,
		...spec.numberedBases.map((baseName) => `${baseName}_1..N`),
		...spec.singles,
	].filter((envName, index, envNames) => envNames.indexOf(envName) === index);
}

export function providerKeyCount(providerId: KeyPoolProviderId): number {
	return getProviderKeyCandidates(providerId).length;
}

const LLM_PROVIDER_SET = new Set([
	"gemini",
	"groq",
	"openai",
	"anthropic",
	"deepseek",
]);

export function keyRetryLimit(providerId: KeyPoolProviderId): number {
	const configuredKeyCount = providerKeyCount(providerId);
	if (!configuredKeyCount) return 0;
	const isLlm = LLM_PROVIDER_SET.has(String(providerId).toLowerCase());
	const defaultLimit = isLlm
		? configuredKeyCount
		: Math.min(3, configuredKeyCount);
	const requested = numberFromEnv(
		isLlm ? "DENTAL_LLM_KEY_RETRY_LIMIT" : "DENTAL_SPEECH_KEY_RETRY_LIMIT",
		defaultLimit,
	);
	return Math.max(1, Math.min(requested, configuredKeyCount));
}

export function getAvailableProviderKeys(
	providerId: KeyPoolProviderId,
): {
	available: SpeechProviderKeyCandidate[];
	coolingDown: SpeechProviderKeyCandidate[];
	nearestCooldownWaitSeconds: number;
} {
	const candidates = getProviderKeyCandidates(providerId);
	const now = Date.now();
	const available: SpeechProviderKeyCandidate[] = [];
	const coolingDown: SpeechProviderKeyCandidate[] = [];

	for (const candidate of candidates) {
		const health = healthFor(providerId, candidate);
		if (health.cooldownUntil <= now) {
			available.push(candidate);
		} else {
			coolingDown.push(candidate);
		}
	}

	let nearestCooldownWaitSeconds = 0;
	if (coolingDown.length > 0) {
		const minCooldown = Math.min(
			...coolingDown.map((c) => healthFor(providerId, c).cooldownUntil),
		);
		nearestCooldownWaitSeconds = Math.max(
			0,
			Math.ceil((minCooldown - now) / 1000),
		);
	}

	return { available, coolingDown, nearestCooldownWaitSeconds };
}

export function getProviderKeyPoolSummary(
	providerId: KeyPoolProviderId,
): SpeechProviderKeyPoolSummary {
	const candidates = getProviderKeyCandidates(providerId);
	const now = Date.now();
	const coolingDownKeyCount = candidates.filter(
		(candidate) => healthFor(providerId, candidate).cooldownUntil > now,
	).length;

	return {
		configuredKeyCount: candidates.length,
		availableKeyCount: Math.max(0, candidates.length - coolingDownKeyCount),
		coolingDownKeyCount,
		rotationEnabled: candidates.length > 1,
		maxAttemptsPerProvider: keyRetryLimit(providerId),
		timeoutMs: speechProviderTimeoutMs(),
		rateLimitCooldownMs: rateLimitCooldownMs(),
		errorCooldownMs: errorCooldownMs(),
		authCooldownMs: authCooldownMs(),
	};
}

export function getProviderKeyHealthSnapshots(
	providerId: KeyPoolProviderId,
): SpeechProviderKeyHealthSnapshot[] {
	const now = Date.now();
	return getProviderKeyCandidates(providerId).map((candidate) => {
		const health = healthFor(providerId, candidate);
		const coolingDown = health.cooldownUntil > now;
		return {
			fingerprint: candidate.fingerprint,
			source: candidate.source,
			ordinal: candidate.ordinal,
			available: !coolingDown,
			coolingDownUntil: coolingDown
				? new Date(health.cooldownUntil).toISOString()
				: null,
			failures: health.failures,
			consecutiveFailures: health.consecutiveFailures,
			successes: health.successes,
			lastUsedAt: health.lastUsedAt
				? new Date(health.lastUsedAt).toISOString()
				: null,
			lastStatusCode: health.lastStatusCode,
			lastError: health.lastError,
		};
	});
}

const roundRobinIndexByProvider = new Map<string, number>();

export function selectProviderKey(
	providerId: KeyPoolProviderId,
	triedFingerprints: Set<string> = new Set<string>(),
	mode: KeySelectionMode = "round_robin",
): SpeechProviderKeyCandidate | null {
	const allCandidates = getProviderKeyCandidates(providerId);
	if (!allCandidates.length) return null;

	const now = Date.now();
	const availableCandidates = allCandidates.filter((candidate) => {
		const health = healthFor(providerId, candidate);
		return (
			health.cooldownUntil <= now &&
			!triedFingerprints.has(candidate.fingerprint)
		);
	});
	if (!availableCandidates.length) return null;

	if (mode === "random") {
		return availableCandidates[randomInt(availableCandidates.length)] ?? null;
	}

	const currentIdx = roundRobinIndexByProvider.get(providerId) ?? 0;
	for (let step = 0; step < allCandidates.length; step++) {
		const idx = (currentIdx + step) % allCandidates.length;
		const candidate = allCandidates[idx];
		if (
			candidate &&
			healthFor(providerId, candidate).cooldownUntil <= now &&
			!triedFingerprints.has(candidate.fingerprint)
		) {
			roundRobinIndexByProvider.set(
				providerId,
				(idx + 1) % allCandidates.length,
			);
			return candidate;
		}
	}

	return availableCandidates[0] ?? null;
}

export function recordProviderKeySuccess(
	providerId: KeyPoolProviderId,
	candidate: SpeechProviderKeyCandidate,
): void {
	const previous = healthFor(providerId, candidate);
	keyHealthByFingerprint.set(healthKey(providerId, candidate), {
		cooldownUntil: 0,
		failures: 0,
		consecutiveFailures: 0,
		successes: previous.successes + 1,
		lastUsedAt: Date.now(),
		lastStatusCode: null,
		lastError: null,
	});
	saveKeyHealthToDisk();
}

export function recordProviderKeyFailure(
	providerId: KeyPoolProviderId,
	candidate: SpeechProviderKeyCandidate,
	error: unknown,
): void {
	const previous = healthFor(providerId, candidate);
	const requestError =
		error instanceof SpeechProviderRequestError ? error : null;
	const statusCode =
		requestError?.statusCode ??
		(typeof (error as any)?.statusCode === "number"
			? (error as any).statusCode
			: null);
	const errorMessage = sanitizeProviderErrorMessage(
		error instanceof Error ? error.message : String(error ?? ""),
	);
	const errLower = errorMessage.toLowerCase();

	const isRateLimit =
		requestError?.rateLimited === true ||
		statusCode === 429 ||
		/\b429\b|rate[ _-]?limit|quota|resource[_ ]exhausted/i.test(errLower);

	const isAuthFailure =
		statusCode === 401 ||
		statusCode === 403 ||
		/\b(401|403)\b|unauthorized|forbidden|permission|key invalid|policy violation/i.test(errLower);

	const isServerError =
		requestError?.retryable === true ||
		requestError?.timedOut === true ||
		(statusCode !== null && (statusCode >= 500 || statusCode === 408)) ||
		/\b(500|502|503|504|408)\b|unavailable|overloaded|deadline|timeout/i.test(errLower);

	let baseCooldownMs = 0;
	const consecutiveFailures = (previous.consecutiveFailures || 0) + 1;

	if (isRateLimit) {
		baseCooldownMs = rateLimitCooldownMs();
	} else if (isAuthFailure) {
		const isPermanentRevoked =
			/api_key_invalid|consumer_invalid|not registered|revoked|key has been revoked/i.test(errLower);
		baseCooldownMs = isPermanentRevoked
			? 365 * 24 * 60 * 60 * 1000
			: authCooldownMs();
	} else if (isServerError || isLikelyTransientProviderError(error)) {
		baseCooldownMs = errorCooldownMs();
	}

	// Exponential backoff: baseCooldownMs * 2^(consecutiveFailures - 1), capped at 16x
	const backoffMultiplier = Math.min(
		2 ** Math.max(0, consecutiveFailures - 1),
		16,
	);
	const cooldownMs = baseCooldownMs * backoffMultiplier;

	const maskedKey = candidate.value ? `...${candidate.value.slice(-6)}` : "unknown";
	if (isRateLimit) {
		console.warn(
			`[KeyPool:${String(providerId)}] Key ${maskedKey} RATE LIMITED (429/quota). Consecutive=${consecutiveFailures}. Cooldown=${Math.round(cooldownMs / 1000)}s.`,
		);
	} else if (isAuthFailure) {
		console.warn(
			`[KeyPool:${String(providerId)}] Key ${maskedKey} AUTH FAILED (${statusCode ?? "403"}). Consecutive=${consecutiveFailures}. Cooldown=${Math.round(cooldownMs / 1000)}s. Error: ${errorMessage}`,
		);
	} else {
		console.warn(
			`[KeyPool:${String(providerId)}] Key ${maskedKey} FAILED. Consecutive=${consecutiveFailures}. Cooldown=${Math.round(cooldownMs / 1000)}s. Error: ${errorMessage}`,
		);
	}

	keyHealthByFingerprint.set(healthKey(providerId, candidate), {
		cooldownUntil:
			cooldownMs > 0 ? Date.now() + cooldownMs : previous.cooldownUntil,
		failures: previous.failures + 1,
		consecutiveFailures,
		successes: previous.successes,
		lastUsedAt: Date.now(),
		lastStatusCode: statusCode,
		lastError: sanitizeProviderErrorMessage(
			error instanceof Error ? error.message : "unknown provider error",
		),
	});
	saveKeyHealthToDisk();
}

export function resetProviderKeyCooldowns(providerId?: KeyPoolProviderId): void {
	if (providerId) {
		const prefix = `${providerId}:`;
		for (const key of Array.from(keyHealthByFingerprint.keys())) {
			if (key.startsWith(prefix)) {
				keyHealthByFingerprint.delete(key);
			}
		}
		roundRobinIndexByProvider.delete(providerId);
	} else {
		keyHealthByFingerprint.clear();
		roundRobinIndexByProvider.clear();
	}
	saveKeyHealthToDisk();
}

export function shouldTryNextProviderKey(error: unknown): boolean {
	if (!(error instanceof SpeechProviderRequestError))
		return isLikelyTransientProviderError(error);
	if (error.rateLimited || error.timedOut || error.retryable) return true;
	return error.statusCode === 401 || error.statusCode === 403;
}

export function providerHttpError(
	statusCode: number,
	statusText: string,
	message?: string,
): SpeechProviderRequestError {
	const rateLimited = statusCode === 429;
	const retryable =
		rateLimited ||
		statusCode === 408 ||
		statusCode >= 500 ||
		statusCode === 401 ||
		statusCode === 403;
	const detail = sanitizeProviderErrorMessage(
		message || `${statusCode} ${statusText}`,
	);
	return new SpeechProviderRequestError(detail, {
		statusCode,
		retryable,
		rateLimited,
	});
}
