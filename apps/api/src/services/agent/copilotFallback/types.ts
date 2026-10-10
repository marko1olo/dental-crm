/**
 * types.ts — Layer 0: Copilot Fallback Contracts, Health States & Route Context.
 * Zero runtime dependencies (Mandate 8b DAG Layer 0).
 */

import type { LLMStreamEvent } from "../types.js";

export type { LLMStreamEvent };

export interface FallbackRouteContext {
	readonly userText: string;
	readonly lower: string;
	readonly contextTooth: number;
	readonly contextPatientId: string;
}

export type LLMProviderType =
	| "gemini"
	| "groq"
	| "openai"
	| "anthropic"
	| "deepseek"
	| "local_deterministic"
	| "semantic_router";

export type ProviderHealthStatus =
	| "healthy"
	| "degraded"
	| "rate_limited"
	| "offline";

export interface ProviderHealthRecord {
	readonly provider: LLMProviderType;
	status: ProviderHealthStatus;
	latencyMs: number;
	lastCheckedAt: number;
	consecutiveFailures: number;
	rateLimitResetAt?: number | undefined;
	lastError?: string | undefined;
}

export type FallbackReason =
	| "primary_healthy"
	| "timeout_exceeded"
	| "rate_limit_429"
	| "service_unavailable_503"
	| "network_error"
	| "offline_mandatory"
	| "deterministic_command"
	| "knowledge_inquiry";

export interface FallbackDecision {
	readonly target: LLMProviderType;
	readonly reason: FallbackReason;
	readonly priority: number;
	readonly fallbackChain: readonly LLMProviderType[];
	readonly timeoutMs: number;
}
