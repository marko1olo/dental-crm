/**
 * AgentRouter (DeepSeek) Resilient Industrial Network Client (Facade)
 *
 * Decomposed into modular architecture under apps/api/src/ai/router/ per Mandate 8b:
 * - routerTypes.ts: Type contracts, constants, and custom error types
 * - keyPoolManager.ts: Multi-key round-robin rotation, cooldown & model budget tracker
 * - modelAdapters.ts: Request payload formatter and tool call argument parser
 * - streamParser.ts: Server-Sent Events (SSE) stream reader & tool-call accumulator
 * - agentRouterCore.ts: Core high-availability AgentRouter client implementation
 */

export {
	DEFAULT_AGENTROUTER_BASE_URL,
	DEFAULT_AGENTROUTER_MODEL,
	DEFAULT_AGENTROUTER_KEYS,
	DEFAULT_GEMINI_BASE_URL,
	DEFAULT_GEMINI_MODEL,
	SUPPORTED_GEMINI_MODELS,
	type SupportedGeminiModel,
	type GeminiHealthCheckResult,
	DEFAULT_TIMEOUT_MS,
	DEFAULT_CHAIRSIDE_TIMEOUT_MS,
	MIN_REASONING_MAX_TOKENS,
	DEFAULT_CLINICAL_TEMPERATURE,
	RATE_LIMIT_COOLDOWN_MS,
	SERVER_ERROR_COOLDOWN_MS,
	AUTH_ERROR_COOLDOWN_MS,
	MODEL_OVERLOAD_COOLDOWN_MS,
	type AgentRouterRole,
	type AgentRouterToolCallFunction,
	type AgentRouterToolCall,
	type AgentRouterChatMessage,
	type AgentRouterToolDefinition,
	type AgentRouterToolChoice,
	type AgentRouterChatParams,
	type AgentRouterChoice,
	type AgentRouterUsage,
	type AgentRouterChatResponse,
	type AgentRouterToolCallDelta,
	type AgentRouterStreamCallbacks,
	type AgentRouterClientConfig,
	type KeyHealthInfo,
	type ModelHealthInfo,
	AgentRouterModelOverloadedError,
	AgentRouterAllKeysExhaustedError,
} from "./router/routerTypes.js";

export {
	maskApiKey,
	maskKeysInText,
	parseApiKeys,
	parseAllConfiguredApiKeys,
	KeyPoolManager,
} from "./router/keyPoolManager.js";

export {
	safeParseToolArguments,
	buildChatPayload,
	isGeminiModel,
	isGroqModel,
	getGeminiBaseUrl,
	getGeminiApiKeyCandidates,
	getGroqApiKeyCandidates,
	validateGeminiApiKeyLive,
	validateUniversalApiKeyLive,
	resolveRequestEndpoint,
	resolveEffectiveKeys,
} from "./router/modelAdapters.js";

export {
	readSseStream,
} from "./router/streamParser.js";

export {
	AgentRouterClient,
} from "./router/agentRouterCore.js";

import {
	AgentRouterClient,
} from "./router/agentRouterCore.js";
import type {
	AgentRouterChatParams,
	AgentRouterChatResponse,
	AgentRouterStreamCallbacks,
} from "./router/routerTypes.js";

/**
 * Global singleton instance with environment configuration
 */
export const agentRouterClient = new AgentRouterClient();

/**
 * Functional facade for standard non-streaming completions
 */
export async function createChatCompletion(
	params: AgentRouterChatParams,
): Promise<AgentRouterChatResponse> {
	return agentRouterClient.createChatCompletion(params);
}

/**
 * Functional facade for streaming completions
 */
export async function createStreamingChatCompletion(
	params: AgentRouterChatParams,
	callbacks: AgentRouterStreamCallbacks = {},
): Promise<AgentRouterChatResponse> {
	return agentRouterClient.createStreamingChatCompletion(params, callbacks);
}
