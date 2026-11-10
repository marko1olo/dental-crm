/**
 * @file apps/api/src/ai/tokenCounter.ts
 * @description Fastify AI Token Counter & Context Limits Integration for DENTE Clinic.
 *
 * Re-exports token counting BPE heuristics and model specs from @dental/shared,
 * providing typed adapter for Fastify agent routes and ReAct harness.
 */

export {
	MODEL_CONTEXT_REGISTRY,
	DEFAULT_MODEL_CONTEXT_SPEC,
	type ModelContextSpec,
	type ChatMessageLike,
	type ProviderUsageMetadata,
	type TokenUsageReport,
	getModelContextSpec,
	estimateTextTokens,
	estimateTokenCount,
	estimateToolCallTokens,
	estimateMessageTokens,
	estimateConversationTokens,
	buildTokenUsageReport,
	calculateTokenUsageReport,
} from "@dental/shared";
