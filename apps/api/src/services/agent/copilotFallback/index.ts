/**
 * index.ts — Barrel Export for Copilot Fallback Subsystem (Mandate 8b).
 */

export type {
	FallbackDecision,
	FallbackReason,
	FallbackRouteContext,
	LLMProviderType,
	LLMStreamEvent,
	ProviderHealthRecord,
	ProviderHealthStatus,
} from "./types.js";

export {
	ProviderHealthMonitor,
	providerHealthMonitor,
} from "./providerHealthMonitor.js";

export {
	FallbackDecisionMatrix,
	fallbackDecisionMatrix,
} from "./fallbackDecisionMatrix.js";

export {
	formatCopilotKnowledgeAnswer,
	tryResolveDirectComponentKnowledge,
	tryResolveKnowledgeInquiry,
} from "./knowledgeFallback.js";

export {
	routeCopilotFallback,
} from "./streamFallbackAdapter.js";
