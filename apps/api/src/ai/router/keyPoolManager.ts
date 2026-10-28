/**
 * keyPoolManager.ts — Multi-Key Round-Robin Rotation, Cooldown & Model Budget Tracker
 */

import {
	DEFAULT_AGENTROUTER_KEYS,
	type KeyHealthInfo,
	type ModelHealthInfo,
	AgentRouterAllKeysExhaustedError,
} from "./routerTypes.js";

/**
 * Mask raw API key to prevent secret leakage in logs or stacktraces.
 * Example: "agentrouter...T3u"
 */
export function maskApiKey(key: string | null | undefined): string {
	if (!key || typeof key !== "string") return "agentrouter...none";
	const trimmed = key.trim();
	if (trimmed.length <= 5) return "agentrouter...*****";
	return `agentrouter...${trimmed.slice(-5)}`;
}

/**
 * Parse comma-separated list of API keys with safe trimming, filtering, and fallback.
 */
export function parseApiKeys(envValue?: string | null): string[] {
	if (!envValue || typeof envValue !== "string") {
		return [...DEFAULT_AGENTROUTER_KEYS];
	}
	const parsed = envValue
		.split(",")
		.map((k) => k.trim())
		.filter((k) => k.length > 0);
	return parsed.length > 0 ? parsed : [...DEFAULT_AGENTROUTER_KEYS];
}

export class KeyPoolManager {
	private readonly apiKeys: string[];
	private readonly keyCooldowns = new Map<string, number>();
	private readonly keyFailures = new Map<string, number>();
	private readonly modelBans = new Map<string, number>();
	private roundRobinIndex = 0;

	constructor(keys: string[]) {
		this.apiKeys = [...keys];
	}

	getKeys(): readonly string[] {
		return this.apiKeys;
	}

	clearCooldowns(): void {
		this.keyCooldowns.clear();
		this.keyFailures.clear();
		this.modelBans.clear();
		this.roundRobinIndex = 0;
	}

	isModelBanned(model: string): boolean {
		const bannedUntil = this.modelBans.get(model) || 0;
		return Date.now() < bannedUntil;
	}

	getModelBanExpiry(model: string): number {
		return this.modelBans.get(model) || 0;
	}

	banModel(model: string, durationSeconds: number): void {
		const until = Date.now() + durationSeconds * 1000;
		this.modelBans.set(model, until);
	}

	getKeyHealthSnapshot(): KeyHealthInfo[] {
		const now = Date.now();
		return this.apiKeys.map((key) => {
			const cd = this.keyCooldowns.get(key) || 0;
			return {
				keyMask: maskApiKey(key),
				cooldownUntil: cd,
				isAvailable: now >= cd,
				failures: this.keyFailures.get(key) || 0,
			};
		});
	}

	getModelHealthSnapshot(): ModelHealthInfo[] {
		const now = Date.now();
		return Array.from(this.modelBans.entries()).map(([model, bannedUntil]) => ({
			model,
			bannedUntil,
			isBanned: now < bannedUntil,
		}));
	}

	selectNextKey(): { key: string; isFallback: boolean } {
		const now = Date.now();
		const total = this.apiKeys.length;
		if (total === 0) {
			throw new Error("AgentRouter key pool is empty. No API keys configured.");
		}

		// Try to find available key starting from roundRobinIndex
		for (let i = 0; i < total; i++) {
			const idx = (this.roundRobinIndex + i) % total;
			const candidate = this.apiKeys[idx];
			if (!candidate) continue;
			const cd = this.keyCooldowns.get(candidate) || 0;
			if (now >= cd) {
				this.roundRobinIndex = (idx + 1) % total;
				return { key: candidate, isFallback: false };
			}
		}

		// All keys are on cooldown. Find key with nearest cooldown expiry.
		let nearestKey = this.apiKeys[0] || "";
		let minCd = this.keyCooldowns.get(nearestKey) || Infinity;
		for (const k of this.apiKeys) {
			const cd = this.keyCooldowns.get(k) || 0;
			if (cd < minCd) {
				minCd = cd;
				nearestKey = k;
			}
		}

		const waitMs = Math.max(0, minCd - now);
		// Return nearest key if within 3 seconds, otherwise throw explicit error
		if (waitMs <= 3000 && nearestKey) {
			return { key: nearestKey, isFallback: true };
		}

		throw new AgentRouterAllKeysExhaustedError(waitMs);
	}

	noteKeyFailure(key: string, cooldownMs: number, reason: string): void {
		const now = Date.now();
		const until = now + cooldownMs;
		this.keyCooldowns.set(key, until);
		const fails = (this.keyFailures.get(key) || 0) + 1;
		this.keyFailures.set(key, fails);

		console.warn(
			`[AgentRouter] Key ${maskApiKey(key)} placed on ${Math.ceil(cooldownMs / 1000)}s cooldown. Reason: ${reason} (failure count: ${fails})`,
		);
	}

	noteKeySuccess(key: string): void {
		this.keyFailures.delete(key);
		this.keyCooldowns.delete(key);
	}
}
