/**
 * @file apps/api/src/ai/tokenCounter.ts
 * @description Fastify AI Token Counter & Context Limits Integration for DENTE Clinic.
 *
 * Re-exports token counting BPE heuristics and model specs from @dental/shared/ai,
 * providing typed adapter for Fastify agent routes and ReAct harness.
 */

export {
	MODEL_CONTEXT_REGISTRY,
	type ModelContextSpec,
	type ChatMessageLike,
	type ProviderUsageMetadata,
	type TokenUsageReport,
	getModelContextSpec,
	estimateTextTokens,
	estimateToolCallTokens,
	estimateMessageTokens,
	estimateConversationTokens,
	buildTokenUsageReport,
} from "@dental/shared";
