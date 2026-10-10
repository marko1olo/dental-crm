/**
 * providerHealthMonitor.ts — Layer 1: Health Monitor for LLM Providers & Inference Backends.
 *
 * Tracks availability, latency, rate limits (429), and service degradation (503)
 * across Gemini models, local deterministic fallbacks, and external APIs (Mandates 8e, 8n).
 */

import type {
	LLMProviderType,
	ProviderHealthRecord,
	ProviderHealthStatus,
} from "./types.js";

const DEFAULT_COOLDOWN_MS = 30_000; // 30s cool-down on HTTP 429
const MAX_CONSECUTIVE_FAILURES = 3;

export class ProviderHealthMonitor {
	private readonly records = new Map<LLMProviderType, ProviderHealthRecord>();

	constructor() {
		this.reset();
	}

	public reset(): void {
		this.records.clear();
		const defaultProviders: LLMProviderType[] = [
			"gemini",
			"groq",
			"openai",
			"anthropic",
			"deepseek",
			"local_deterministic",
			"semantic_router",
		];

		const now = Date.now();
		for (const p of defaultProviders) {
			this.records.set(p, {
				provider: p,
				status: "healthy",
				latencyMs: 15,
				lastCheckedAt: now,
				consecutiveFailures: 0,
			});
		}
	}

	public getProviderHealth(provider: LLMProviderType): ProviderHealthRecord {
		let record = this.records.get(provider);
		if (!record) {
			record = {
				provider,
				status: "healthy",
				latencyMs: 15,
				lastCheckedAt: Date.now(),
				consecutiveFailures: 0,
			};
			this.records.set(provider, record);
		}

		// Check if 429 cool-down has expired
		if (
			record.status === "rate_limited" &&
			record.rateLimitResetAt &&
			Date.now() >= record.rateLimitResetAt
		) {
			record.status = "healthy";
			record.rateLimitResetAt = undefined;
			record.consecutiveFailures = 0;
		}

		return record;
	}

	public isProviderAvailable(provider: LLMProviderType): boolean {
		const health = this.getProviderHealth(provider);
		return health.status === "healthy" || health.status === "degraded";
	}

	public recordSuccess(provider: LLMProviderType, latencyMs: number): void {
		const record = this.getProviderHealth(provider);
		record.status = "healthy";
		record.latencyMs = latencyMs;
		record.lastCheckedAt = Date.now();
		record.consecutiveFailures = 0;
		record.lastError = undefined;
		record.rateLimitResetAt = undefined;
	}

	public recordFailure(
		provider: LLMProviderType,
		statusCode?: number,
		errorMessage?: string,
	): void {
		const record = this.getProviderHealth(provider);
		record.lastCheckedAt = Date.now();
		record.consecutiveFailures += 1;
		record.lastError = errorMessage;

		if (statusCode === 429) {
			record.status = "rate_limited";
			record.rateLimitResetAt = Date.now() + DEFAULT_COOLDOWN_MS;
		} else if (
			statusCode === 503 ||
			statusCode === 504 ||
			record.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
		) {
			record.status = "offline";
		} else {
			record.status = "degraded";
		}
	}

	public markRateLimited(
		provider: LLMProviderType,
		coolDownMs = DEFAULT_COOLDOWN_MS,
	): void {
		const record = this.getProviderHealth(provider);
		record.status = "rate_limited";
		record.rateLimitResetAt = Date.now() + coolDownMs;
		record.lastCheckedAt = Date.now();
	}

	public getAllReports(): Record<string, ProviderHealthRecord> {
		const result: Record<string, ProviderHealthRecord> = {};
		for (const [key, value] of this.records.entries()) {
			result[key] = { ...this.getProviderHealth(key) };
		}
		return result;
	}
}

export const providerHealthMonitor = new ProviderHealthMonitor();
