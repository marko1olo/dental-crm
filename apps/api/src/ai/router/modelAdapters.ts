/**
 * modelAdapters.ts — Request Payload Formatter and Tool Call Argument Parser
 */

import {
	type AgentRouterChatParams,
	type AgentRouterToolCall,
	DEFAULT_CLINICAL_TEMPERATURE,
	MIN_REASONING_MAX_TOKENS,
} from "./routerTypes.js";

/**
 * Safely parse JSON arguments of a tool call. Returns null on failure without throwing.
 */
export function safeParseToolArguments<T = Record<string, unknown>>(
	toolCall: AgentRouterToolCall | { function?: { arguments?: string } },
): T | null {
	const raw = toolCall?.function?.arguments;
	if (!raw || typeof raw !== "string") return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

/**
 * Build HTTP payload conforming to OpenAI Chat Completions standard.
 */
export function buildChatPayload(
	params: AgentRouterChatParams,
	defaultModel: string,
	stream: boolean,
): Record<string, unknown> {
	const targetModel = params.model || defaultModel;

	// DeepSeek / reasoning models need >= 4096 tokens so CoT doesn't eat the response
	const requestedMax = params.max_tokens;
	const effectiveMaxTokens =
		requestedMax !== undefined
			? Math.max(MIN_REASONING_MAX_TOKENS, requestedMax)
			: MIN_REASONING_MAX_TOKENS;

	const payload: Record<string, unknown> = {
		model: targetModel,
		messages: params.messages,
		temperature: params.temperature ?? DEFAULT_CLINICAL_TEMPERATURE,
		max_tokens: effectiveMaxTokens,
		stream,
	};

	if (params.top_p !== undefined) payload.top_p = params.top_p;
	if (params.frequency_penalty !== undefined)
		payload.frequency_penalty = params.frequency_penalty;
	if (params.presence_penalty !== undefined)
		payload.presence_penalty = params.presence_penalty;
	if (params.stop !== undefined) payload.stop = params.stop;
	if (params.response_format) payload.response_format = params.response_format;

	if (params.tools && params.tools.length > 0) {
		payload.tools = params.tools;
		payload.tool_choice = params.tool_choice ?? "auto";
	}

	return payload;
}
