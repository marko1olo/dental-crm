/**
 * omniGatewayTypes.ts — Shared Types, Error Classes & Streaming Utilities for Omni-LLM Gateway.
 */

import type { ProviderMessage } from "./types.js";

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
	readonly providers?: Partial<Record<LlmProviderId, ProviderConfig>> | undefined;
}

export interface ChatOptions {
	readonly system?: string | undefined;
	readonly modelId?: string | undefined;
	readonly temperature?: number | undefined;
	readonly maxTokens?: number | undefined;
	readonly timeoutMs?: number | undefined;
	readonly organizationId?: string | undefined;
	readonly clinicAiSettings?: ClinicAiSettings | undefined;
	readonly signal?: AbortSignal | undefined;
	readonly extraHeaders?: Record<string, string> | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly fallbackChain?: readonly LlmProviderId[] | undefined;
	readonly responseFormat?: { readonly type: "json_object" | string } | undefined;
}

export interface LlmProviderAdapter {
	readonly providerId: LlmProviderId;
	readonly defaultModel: string;
	readonly supportedModels: readonly string[];
	chatStream(
		messages: ProviderMessage[],
		tools: (AgentTool | Record<string, unknown>)[],
		options: ChatOptions,
	): AsyncIterable<LlmStreamChunk>;
}

export class LlmProviderError extends Error {
	public readonly providerId: LlmProviderId;
	public readonly statusCode: number | null;
	public readonly retryable: boolean;

	constructor(
		message: string,
		options: {
			providerId: LlmProviderId;
			statusCode?: number | null | undefined;
			retryable?: boolean | undefined;
		},
	) {
		super(`[${options.providerId}] ${message}`);
		this.name = "LlmProviderError";
		this.providerId = options.providerId;
		this.statusCode = options.statusCode ?? null;
		this.retryable = options.retryable ?? false;
	}
}

export class OmniGatewayExhaustedError extends Error {
	public readonly attemptedProviders: readonly {
		providerId: LlmProviderId;
		error: string;
		statusCode: number | null;
	}[];

	constructor(
		attemptedProviders: {
			providerId: LlmProviderId;
			error: string;
			statusCode: number | null;
		}[],
	) {
		const summary = attemptedProviders
			.map((p) => `${p.providerId} (status: ${p.statusCode ?? "ERR"}): ${p.error}`)
			.join("; ");
		super(`All configured LLM providers failed: ${summary}`);
		this.name = "OmniGatewayExhaustedError";
		this.attemptedProviders = attemptedProviders;
	}
}

export type CircuitBreakerState = "closed" | "open" | "half_open";

export interface ProviderHealthRecord {
	state: CircuitBreakerState;
	failures: number;
	consecutiveFailures: number;
	successes: number;
	cooldownUntil: number;
	lastError: string | null;
	lastStatusCode: number | null;
	lastAttemptAt: number | null;
	lastSuccessAt: number | null;
}

export interface CircuitBreakerConfig {
	readonly maxConsecutiveFailures: number;
	readonly rateLimitCooldownMs: number;
	readonly serverErrorCooldownMs: number;
	readonly authErrorCooldownMs: number;
	readonly timeoutCooldownMs: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
	maxConsecutiveFailures: 3,
	rateLimitCooldownMs: 60_000, // 60s
	serverErrorCooldownMs: 30_000, // 30s
	authErrorCooldownMs: 600_000, // 10m
	timeoutCooldownMs: 30_000, // 30s
};

export const DEFAULT_FALLBACK_CHAIN: readonly LlmProviderId[] = [
	"deepseek",
	"groq",
	"gemini",
	"openai",
	"anthropic",
] as const;

/**
 * Universal Server-Sent Events (SSE) stream parser for ReadableStream<Uint8Array>.
 */
export async function* parseSseStream(
	stream: ReadableStream<Uint8Array>,
	signal?: AbortSignal | undefined,
): AsyncGenerator<{ event?: string | undefined; data: string }, void, unknown> {
	const reader = stream.getReader();
	const decoder = new TextDecoder("utf-8");
	let buffer = "";

	try {
		while (true) {
			if (signal?.aborted) {
				throw new Error("AbortError: Operation aborted");
			}
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });

			let separatorIndex: number;
			while ((separatorIndex = buffer.search(/\r?\n\r?\n/)) !== -1) {
				const match = buffer.match(/\r?\n\r?\n/);
				const matchLen = match ? match[0].length : 2;
				const frame = buffer.slice(0, separatorIndex);
				buffer = buffer.slice(separatorIndex + matchLen);

				let event: string | undefined;
				const dataLines: string[] = [];

				for (const line of frame.split(/\r?\n/)) {
					const trimmed = line.trim();
					if (!trimmed || trimmed.startsWith(":")) continue;
					if (trimmed.startsWith("event:")) {
						event = trimmed.slice(6).trim();
					} else if (trimmed.startsWith("data:")) {
						dataLines.push(trimmed.slice(5).trim());
					}
				}

				if (dataLines.length > 0) {
					yield {
						...(event !== undefined ? { event } : {}),
						data: dataLines.join("\n"),
					};
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}
