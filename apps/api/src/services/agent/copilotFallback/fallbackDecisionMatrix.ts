/**
 * fallbackDecisionMatrix.ts — Layer 2: Decision Matrix for Model Failover & Chairside Timeout Resilience.
 *
 * Implements deterministic instant decision making when LLM providers experience 429 rate limits,
 * 503 service outages, or chairside latency spikes (Mandates 8e, 8n, 8i).
 */

import { providerHealthMonitor } from "./providerHealthMonitor.js";
import type {
	FallbackDecision,
	FallbackReason,
	FallbackRouteContext,
	LLMProviderType,
} from "./types.js";

export interface DecisionOptions {
	preferredProvider?: LLMProviderType | undefined;
	errorCode?: number | undefined;
	isOffline?: boolean | undefined;
	latencyExceeded?: boolean | undefined;
}

export class FallbackDecisionMatrix {
	private readonly primaryChain: readonly LLMProviderType[] = [
		"gemini",
		"groq",
		"semantic_router",
		"local_deterministic",
	];

	/**
	 * Selects the optimal execution target based on provider health, network state, and chairside timeouts.
	 */
	public decide(
		ctx: FallbackRouteContext,
		options: DecisionOptions = {},
	): FallbackDecision {
		const { errorCode, isOffline, latencyExceeded } = options;

		// 1. Mandatory Offline or local execution requested
		if (isOffline) {
			return {
				target: "local_deterministic",
				reason: "offline_mandatory",
				priority: 1,
				fallbackChain: ["local_deterministic"],
				timeoutMs: 0,
			};
		}

		// 2. HTTP 429 Rate Limit Hit
		if (errorCode === 429) {
			providerHealthMonitor.markRateLimited(
				options.preferredProvider || "gemini",
			);
			return {
				target: "local_deterministic",
				reason: "rate_limit_429",
				priority: 2,
				fallbackChain: ["groq", "semantic_router", "local_deterministic"],
				timeoutMs: 50,
			};
		}

		// 3. HTTP 503 / 504 or Network Timeout
		if (errorCode === 503 || errorCode === 504 || latencyExceeded) {
			providerHealthMonitor.recordFailure(
				options.preferredProvider || "gemini",
				errorCode || 504,
				"Chairside timeout exceeded",
			);
			return {
				target: "local_deterministic",
				reason: latencyExceeded ? "timeout_exceeded" : "service_unavailable_503",
				priority: 3,
				fallbackChain: ["semantic_router", "local_deterministic"],
				timeoutMs: 0,
			};
		}

		// 4. Check if primary provider is healthy
		const preferred = options.preferredProvider || "gemini";
		if (providerHealthMonitor.isProviderAvailable(preferred)) {
			return {
				target: preferred,
				reason: "primary_healthy",
				priority: 0,
				fallbackChain: this.primaryChain,
				timeoutMs: 2500, // Strict 2.5s ceiling for chairside response
			};
		}

		// 5. Fallback to secondary provider if available
		const secondary = this.primaryChain.find(
			(p) => p !== preferred && providerHealthMonitor.isProviderAvailable(p),
		);

		if (secondary) {
			return {
				target: secondary,
				reason: "rate_limit_429",
				priority: 1,
				fallbackChain: [secondary, "local_deterministic"],
				timeoutMs: 2000,
			};
		}

		// 6. Absolute zero-dead-end fallback: Local Deterministic Router
		return {
			target: "local_deterministic",
			reason: "deterministic_command",
			priority: 4,
			fallbackChain: ["local_deterministic"],
			timeoutMs: 0,
		};
	}

	/**
	 * Fast-path check: returns true if input is an imperative operational command.
	 */
	public isFastPathOperationalCommand(lower: string): boolean {
		return (
			lower.includes("зуб") ||
			lower.includes("отмени") ||
			lower.includes("перенеси") ||
			lower.includes("запиши") ||
			lower.includes("пациент") ||
			lower.includes("выручк") ||
			lower.includes("смен") ||
			lower.includes("счет") ||
			lower.includes("чек") ||
			lower.includes("скидк") ||
			lower.includes("план") ||
			lower.includes("рецепт")
		);
	}
}

export const fallbackDecisionMatrix = new FallbackDecisionMatrix();
