/**
 * deepseekAgentRouter.ts — AgentRouter streaming integration for DeepSeek models.
 */

import type { ChatOptions, LlmStreamChunk } from "../../omniGatewayTypes.js";
import { LlmProviderError } from "../../omniGatewayTypes.js";
import {
	AgentRouterClient,
	safeParseToolArguments,
	type AgentRouterChatMessage,
	type AgentRouterChatParams,
	type AgentRouterToolDefinition,
} from "../../../../ai/agentRouterClient.js";
import { createProxiedFetch } from "../../proxyDispatcher.js";
import type { FormattedDeepSeekMessage, FormattedDeepSeekTool } from "./deepseekFormatter.js";

export interface StreamAgentRouterParams {
	formattedMessages: FormattedDeepSeekMessage[];
	formattedTools?: FormattedDeepSeekTool[] | undefined;
	options: ChatOptions;
	routerBaseUrl: string;
	routerModel: string;
	routerKeys: string[];
	proxyUrl?: string | null;
	timeoutMs: number;
}

export async function* streamDeepSeekAgentRouter(
	params: StreamAgentRouterParams,
): AsyncIterable<LlmStreamChunk> {
	const {
		formattedMessages,
		formattedTools,
		options,
		routerBaseUrl,
		routerModel,
		routerKeys,
		proxyUrl,
		timeoutMs,
	} = params;

	const config = options.clinicAiSettings?.providers?.deepseek;

	const client = new AgentRouterClient({
		baseUrl: routerBaseUrl,
		defaultModel: routerModel,
		apiKeys: routerKeys,
		fetchFn: options.fetchFn ?? createProxiedFetch(proxyUrl),
	});

	const routerTools: AgentRouterToolDefinition[] | undefined =
		formattedTools && formattedTools.length > 0
			? formattedTools.map((t) => ({
					type: "function",
					function: {
						name: t.function.name,
						description: t.function.description,
						parameters: t.function.parameters,
					},
				}))
			: undefined;

	const chatParams: AgentRouterChatParams = {
		messages: formattedMessages as AgentRouterChatMessage[],
		model: routerModel,
		tools: routerTools,
		tool_choice: routerTools && routerTools.length > 0 ? "auto" : undefined,
		temperature: options.temperature ?? config?.temperature ?? 0.2,
		max_tokens: options.maxTokens ?? config?.maxTokens ?? 4096,
		timeoutMs,
		signal: options.signal,
		...(options.responseFormat?.type === "json_object"
			? { response_format: { type: "json_object" } }
			: {}),
	};

	type QueueItem =
		| { kind: "chunk"; chunk: LlmStreamChunk }
		| { kind: "error"; error: unknown }
		| { kind: "done" };

	const queue: QueueItem[] = [];
	let notify: (() => void) | null = null;

	const push = (item: QueueItem) => {
		queue.push(item);
		if (notify) {
			const cb = notify;
			notify = null;
			cb();
		}
	};

	client
		.createStreamingChatCompletion(chatParams, {
			onChunk: (text) => {
				if (text) {
					push({ kind: "chunk", chunk: { type: "text_delta", text } });
				}
			},
			onReasoningChunk: (text) => {
				if (text) {
					push({ kind: "chunk", chunk: { type: "thinking_delta", text } });
				}
			},
			onToolCallDelta: (delta) => {
				if (delta.function?.name) {
					push({
						kind: "chunk",
						chunk: {
							type: "tool_call_start",
							id: delta.id || `call_${delta.index}`,
							name: delta.function.name,
							index: delta.index,
						},
					});
				}
				if (delta.function?.arguments) {
					push({
						kind: "chunk",
						chunk: {
							type: "tool_call_delta",
							id: delta.id,
							name: delta.function?.name,
							argumentsDelta: delta.function.arguments,
							index: delta.index,
						},
					});
				}
			},
		})
		.then((fullResponse) => {
			const toolCalls = fullResponse.choices[0]?.message?.tool_calls;
			if (toolCalls && toolCalls.length > 0) {
				for (let i = 0; i < toolCalls.length; i++) {
					const tc = toolCalls[i];
					push({
						kind: "chunk",
						chunk: {
							type: "tool_call_end",
							id: tc.id || `call_${i}`,
							name: tc.function?.name || "tool",
							arguments: safeParseToolArguments(tc.function?.arguments),
							index: i,
						},
					});
				}
			}

			if (fullResponse.usage) {
				push({
					kind: "chunk",
					chunk: {
						type: "usage",
						inputTokens: fullResponse.usage.prompt_tokens,
						outputTokens: fullResponse.usage.completion_tokens,
						totalTokens: fullResponse.usage.total_tokens,
					},
				});
			}

			push({
				kind: "chunk",
				chunk: {
					type: "done",
					stopReason: fullResponse.choices[0]?.finish_reason || "stop",
				},
			});

			push({ kind: "done" });
		})
		.catch((err) => {
			push({ kind: "error", error: err });
		});

	while (true) {
		if (queue.length === 0) {
			await new Promise<void>((resolve) => {
				notify = resolve;
			});
		}
		const item = queue.shift()!;
		if (item.kind === "chunk") {
			yield item.chunk;
		} else if (item.kind === "error") {
			const statusCode = (item.error as any)?.status ?? 500;
			const errMsg =
				item.error instanceof Error ? item.error.message : String(item.error);
			throw new LlmProviderError(errMsg, {
				providerId: "deepseek",
				statusCode,
				retryable: statusCode === 429 || statusCode === 402 || statusCode >= 500,
			});
		} else if (item.kind === "done") {
			break;
		}
	}
}
