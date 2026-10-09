import type { SpeechGatewayProvider } from "@dental/shared";
import type { LlmProviderId } from "../../services/agent/omniGatewayTypes.js";

export type KeyPoolProviderId = SpeechGatewayProvider | LlmProviderId | string;

export type ProviderKeySpec = {
	singles: string[];
	lists: string[];
	numberedBases: string[];
};

export type SpeechProviderKeyCandidate = {
	value: string;
	fingerprint: string;
	source: string;
	ordinal: number;
};

/**
 * Alias for SpeechProviderKeyCandidate satisfying SpeechKeyRecord contract
 */
export type SpeechKeyRecord = SpeechProviderKeyCandidate;

export type SpeechProviderKeyPoolSummary = {
	configuredKeyCount: number;
	availableKeyCount: number;
	coolingDownKeyCount: number;
	rotationEnabled: boolean;
	maxAttemptsPerProvider: number;
	timeoutMs: number;
	rateLimitCooldownMs: number;
	errorCooldownMs: number;
	authCooldownMs: number;
};

export type SpeechProviderKeyHealthSnapshot = {
	fingerprint: string;
	source: string;
	ordinal: number;
	available: boolean;
	coolingDownUntil: string | null;
	failures: number;
	consecutiveFailures: number;
	successes: number;
	lastUsedAt: string | null;
	lastStatusCode: number | null;
	lastError: string | null;
};

export type KeyHealth = {
	cooldownUntil: number;
	failures: number;
	consecutiveFailures: number;
	successes: number;
	lastUsedAt: number | null;
	lastStatusCode: number | null;
	lastError: string | null;
};

export type PersistedKeyHealthFile = {
	version: 1;
	savedAt: string;
	health: Record<string, KeyHealth>;
};

export type ModelHealthRecord = {
	bannedUntil: number;
	failures: number;
	lastFailureAt: number | null;
	lastSuccessAt: number | null;
	lastError: string | null;
};

export type PersistedModelHealthFile = {
	version: 1;
	savedAt: string;
	models: Record<string, ModelHealthRecord>;
};

export type KeySelectionMode = "round_robin" | "random";
