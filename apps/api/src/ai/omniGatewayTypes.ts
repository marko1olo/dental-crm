/**
 * omniGatewayTypes.ts — Shared Types, Error Classes & Streaming Utilities for Omni-LLM Gateway.
 */

export type LlmProviderId =
	| "openai"
	| "anthropic"
	| "groq"
	| "gemini"
	| "deepseek"
	| (string & {});

export interface TextDeltaChunk {
	readonly type: "text_delta";
	readonly text: string;
}

export interface ThinkingDeltaChunk {
	readonly type: "thinking_delta";
	readonly text: string;
}

export interface ToolCallStartChunk {
	readonly type: "tool_call_start";
	readonly id: string;
	readonly name: string;
	readonly index?: number | undefined;
	readonly thoughtSignature?: string | undefined;
}

export interface ToolCallDeltaChunk {
	readonly type: "tool_call_delta";
	readonly id?: string | undefined;
	readonly name?: string | undefined;
	readonly argumentsDelta: string;
	readonly index?: number | undefined;
}

export interface ToolCallEndChunk {
	readonly type: "tool_call_end";
	readonly id: string;
	readonly name: string;
	readonly arguments: Record<string, unknown> | string;
	readonly index?: number | undefined;
	readonly thoughtSignature?: string | undefined;
}

export interface UsageChunk {
	readonly type: "usage";
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly totalTokens?: number | undefined;
}

export interface DoneChunk {
	readonly type: "done";
	readonly stopReason: string;
}

export interface ErrorChunk {
	readonly type: "error";
	readonly error: string;
	readonly statusCode?: number | null | undefined;
	readonly retryable?: boolean | undefined;
}

export type LlmStreamChunk =
	| TextDeltaChunk
	| ThinkingDeltaChunk
	| ToolCallStartChunk
	| ToolCallDeltaChunk
	| ToolCallEndChunk
	| UsageChunk
	| DoneChunk
	| ErrorChunk;

export interface AgentTool {
	readonly name: string;
	readonly description?: string | undefined;
	readonly parameters?: Record<string, unknown> | undefined;
}

export interface ProviderConfig {
	readonly apiKey?: string | undefined;
	readonly baseUrl?: string | undefined;
	readonly modelId?: string | undefined;
	readonly proxyUrl?: string | undefined;
	readonly temperature?: number | undefined;
	readonly maxTokens?: number | undefined;
	readonly timeoutMs?: number | undefined;
	readonly extraHeaders?: Record<string, string> | undefined;
}

export interface ClinicAiSettings {
	readonly defaultProvider?: LlmProviderId | undefined;
	readonly fallbackChain?: readonly LlmProviderId[] | undefined;
	readonly timeoutMs?: number | undefined;
	readonly temperature?: number | undefined;
	readonly maxTokens?: number | undefined;
	readonly groqApiKey?: string | undefined;
	readonly openaiApiKey?: string | undefined;
	readonly anthropicApiKey?: string | undefined;
	readonly geminiApiKey?: string | undefined;
	readonly deepseekApiKey?: string | undefined;
	readonly customBaseUrl?: string | undefined;
	readonly proxyUrl?: string | undefined;
}

export interface ChatOptions {
	readonly system?: string | undefined;
	readonly modelId?: string | undefined;
	readonly maxTokens?: number | undefined;
	readonly temperature?: number | undefined;
	readonly responseFormat?: { type: "text" | "json_object" } | undefined;
	readonly provider?: LlmProviderId | undefined;
	readonly timeoutMs?: number | undefined;
	readonly apiKey?: string | undefined;
	readonly baseUrl?: string | undefined;
}

