import type { Dispatcher } from "undici";
import type https from "node:https";
import type http from "node:http";
import type {
	KeyPoolProviderId,
	KeySelectionMode,
	SpeechProviderKeyCandidate,
	SpeechProviderKeyHealthSnapshot,
	SpeechProviderKeyPoolSummary,
} from "./types.js";
import {
	getAvailableProviderKeys,
	getProviderAcceptedKeyEnvVars,
	getProviderKeyCandidates,
	getProviderKeyHealthSnapshots,
	getProviderKeyPoolSummary,
	keyRetryLimit,
	providerKeyCount,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	resetProviderKeyCooldowns,
	selectProviderKey,
	clearSpeechKeyHealthMemoryForTests,
} from "./keyRotationEngine.js";
import { getProxyAgent, getWsProxyAgent } from "./proxyAndTunnel.js";

/**
 * High-level Object-Oriented Manager for Speech & LLM Provider Key Pools.
 * Provides intuitive instance-based access while maintaining full backward-compatibility
 * with functional API.
 */
export class SpeechKeyPool {
	readonly providerId: KeyPoolProviderId;

	constructor(providerId: KeyPoolProviderId) {
		this.providerId = providerId;
	}

	getCandidates(): SpeechProviderKeyCandidate[] {
		return getProviderKeyCandidates(this.providerId);
	}

	getAcceptedEnvVars(): string[] {
		return getProviderAcceptedKeyEnvVars(this.providerId);
	}

	getSummary(): SpeechProviderKeyPoolSummary {
		return getProviderKeyPoolSummary(this.providerId);
	}

	getHealthSnapshots(): SpeechProviderKeyHealthSnapshot[] {
		return getProviderKeyHealthSnapshots(this.providerId);
	}

	getAvailable(): {
		available: SpeechProviderKeyCandidate[];
		coolingDown: SpeechProviderKeyCandidate[];
		nearestCooldownWaitSeconds: number;
	} {
		return getAvailableProviderKeys(this.providerId);
	}

	selectKey(
		triedFingerprints: Set<string> = new Set<string>(),
		mode: KeySelectionMode = "round_robin",
	): SpeechProviderKeyCandidate | null {
		return selectProviderKey(this.providerId, triedFingerprints, mode);
	}

	recordSuccess(candidate: SpeechProviderKeyCandidate): void {
		recordProviderKeySuccess(this.providerId, candidate);
	}

	recordFailure(candidate: SpeechProviderKeyCandidate, error: unknown): void {
		recordProviderKeyFailure(this.providerId, candidate, error);
	}

	resetCooldowns(): void {
		resetProviderKeyCooldowns(this.providerId);
	}

	get keyCount(): number {
		return providerKeyCount(this.providerId);
	}

	get retryLimit(): number {
		return keyRetryLimit(this.providerId);
	}

	static getProxyAgent(): Dispatcher | null {
		return getProxyAgent();
	}

	static getWsProxyAgent(): https.Agent | http.Agent | null {
		return getWsProxyAgent();
	}

	static clearHealthMemoryForTests(): void {
		clearSpeechKeyHealthMemoryForTests();
	}
}
