/**
 * openai.ts — OpenAI LLM Provider Adapter.
 * Supports gpt-4o, o3-mini, o1, gpt-4o-mini and OpenAI-compatible endpoints.
 */

import type { ProviderMessage, TextBlock, ToolResultBlock, ToolUseBlock } from "../types.js";
import type {
	AgentTool,
	ChatOptions,
	LlmProviderAdapter,
	LlmProviderId,
	LlmStreamChunk,
} from "../omniGatewayTypes.js";
import { LlmProviderError, parseSseStream } from "../omniGatewayTypes.js";
import {
	getProviderKeyCandidates,
	keyRetryLimit,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	type SpeechProviderKeyCandidate,
} from "../../../speech/keyPool.js";
import { zodToJsonSchema } from "../tools/schemaSerializer.js";
import { createProxiedFetch, getGlobalProxyUrl } from "../proxyDispatcher.js";

export class OpenAiProviderAdapter implements LlmProviderAdapter {
	public readonly providerId: LlmProviderId = "openai";
	public readonly defaultModel: string = "gpt-4o";
	public readonly supportedModels: readonly string[] = [
		"gpt-4o",
		"gpt-4o-mini",
		"o3-mini",
		"o1",
		"o1-mini",
		"gpt-4-turbo",
	] as const;

	public async *chatStream(
		messages: ProviderMessage[],
		tools: (AgentTool | Record<string, unknown>)[],
		options: ChatOptions,
	): AsyncIterable<LlmStreamChunk> {
		const config = options.clinicAiSettings?.providers?.openai;
		const explicitApiKey = config?.apiKey || process.env.OPENAI_API_KEY;

		const candidates: SpeechProviderKeyCandidate[] = explicitApiKey
			? [
					{
						value: explicitApiKey,
						fingerprint: "explicit",
						source: "config",
						ordinal: 1,
					},
				]
			: getProviderKeyCandidates("openai");

		if (candidates.length === 0) {
			throw new LlmProviderError(
				"OPENAI_API_KEY is not configured in clinicAiSettings or environment",
				{ providerId: "openai", statusCode: 401, retryable: true },
			);
		}

		const baseUrl = (
			config?.baseUrl ||
			process.env.OPENAI_BASE_URL ||
			"https://api.openai.com/v1"
		).replace(/\/+$/, "");

		const model = options.modelId || config?.modelId || this.defaultModel;
		const timeoutMs = options.timeoutMs ?? config?.timeoutMs ?? 60_000;
		const proxyUrl =
			config?.proxyUrl ||
			getGlobalProxyUrl("openai");
		const fetchFn = options.fetchFn ?? createProxiedFetch(proxyUrl);

		const isReasoningModel =
			model.startsWith("o1") ||
			model.startsWith("o3") ||
			model.includes("reasoner");

		// Format messages for OpenAI Chat Completions API
		const formattedMessages: Array<{
			role: string;
			content: string | null;
			tool_calls?: Array<{
				id: string;
				type: "function";
				function: { name: string; arguments: string };
			}>;
			tool_call_id?: string;
		}> = [];

		if (options.system) {
			formattedMessages.push({
				role: isReasoningModel ? "developer" : "system",
				content: options.system,
			});
		}

		for (const msg of messages) {
			if (typeof msg.content === "string") {
				formattedMessages.push({
					role: msg.role === "system" && isReasoningModel ? "developer" : msg.role,
					content: msg.content,
				});
				continue;
			}

			if (Array.isArray(msg.content)) {
				const textBlocks = msg.content.filter(
					(b): b is TextBlock => b.type === "text",
				);
				const toolUseBlocks = msg.content.filter(
					(b): b is ToolUseBlock => b.type === "tool_use",
				);
				const toolResultBlocks = msg.content.filter(
					(b): b is ToolResultBlock => b.type === "tool_result",
				);

				if (toolResultBlocks.length > 0) {
					for (const tr of toolResultBlocks) {
						formattedMessages.push({
							role: "tool",
							tool_call_id: tr.toolCallId,
							content:
								typeof tr.content === "string"
									? tr.content
									: JSON.stringify(tr.content),
						});
					}
				} else {
					const textContent = textBlocks.map((b) => b.text).join("\n");
					const toolCalls =
						toolUseBlocks.length > 0
							? toolUseBlocks.map((tu) => ({
									id: tu.id,
									type: "function" as const,
									function: {
										name: tu.name,
										arguments: JSON.stringify(tu.input),
									},
								}))
							: undefined;

					formattedMessages.push({
						role: msg.role,
						content: textContent || null,
						...(toolCalls ? { tool_calls: toolCalls } : {}),
					});
				}
			}
		}

		// Format tools for OpenAI
		const formattedTools =
			tools.length > 0
				? tools.map((t) => {
						if ("type" in t && t.type === "function") {
							return t;
						}
						const agentTool = t as AgentTool;
						let parameters = agentTool.parameters;
						if (parameters && typeof (parameters as any).safeParse === "function") {
							parameters = zodToJsonSchema(parameters as any);
						}
						return {
							type: "function",
							function: {
								name: agentTool.name,
								description: agentTool.description ?? "",
								parameters: parameters ?? {
									type: "object",
									properties: {},
								},
							},
						};
					})
				: undefined;

		const payload: Record<string, unknown> = {
			model,
			messages: formattedMessages,
			stream: true,
			stream_options: { include_usage: true },
			...(options.responseFormat?.type === "json_object"
				? { response_format: { type: "json_object" } }
				: {}),
		};

		if (!isReasoningModel) {
			payload.temperature = options.temperature ?? config?.temperature ?? 0.2;
		}

		if (options.maxTokens || config?.maxTokens) {
			if (isReasoningModel) {
				payload.max_completion_tokens = options.maxTokens ?? config?.maxTokens;
			} else {
				payload.max_tokens = options.maxTokens ?? config?.maxTokens;
			}
		}

		if (formattedTools && formattedTools.length > 0) {
			payload.tools = formattedTools;
		}

		const maxAttempts = explicitApiKey
			? 1
			: Math.max(1, Math.min(candidates.length, keyRetryLimit("openai") || candidates.length));
		const triedFingerprints = new Set<string>();

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const candidate = explicitApiKey
				? candidates[0]
				: selectProviderKey("openai", triedFingerprints, "round_robin");

			if (!candidate) {
				break;
			}
			triedFingerprints.add(candidate.fingerprint);
			const apiKey = candidate.value;

			const controller = new AbortController();
			const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);
			if (options.signal) {
				options.signal.addEventListener("abort", () => controller.abort());
			}

			let response: Response;
			try {
				response = await fetchFn(`${baseUrl}/chat/completions`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json",
						...(config?.extraHeaders || {}),
						...(options.extraHeaders || {}),
					},
					body: JSON.stringify(payload),
					signal: controller.signal,
				});
			} catch (err: unknown) {
				clearTimeout(timeoutTimer);
				const isAbort =
					err instanceof Error &&
					(err.name === "AbortError" || err.message.includes("abort"));
				const reqErr = new LlmProviderError(
					isAbort
						? `OpenAI request timed out after ${timeoutMs}ms`
						: `OpenAI connection failed: ${err instanceof Error ? err.message : String(err)}`,
					{
						providerId: "openai",
						statusCode: isAbort ? 408 : null,
						retryable: true,
					},
				);
				if (!explicitApiKey) {
					recordProviderKeyFailure("openai", candidate, reqErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw reqErr;
			}

			if (!response.ok) {
				clearTimeout(timeoutTimer);
				let errorBody = "";
				try {
					errorBody = await response.text();
				} catch {
					errorBody = response.statusText;
				}
				const statusCode = response.status;
				const retryable =
					statusCode === 429 ||
					statusCode === 408 ||
					statusCode >= 500 ||
					statusCode === 401 ||
					statusCode === 403;

				const reqErr = new LlmProviderError(
					`OpenAI HTTP ${statusCode}: ${errorBody.slice(0, 300)}`,
					{ providerId: "openai", statusCode, retryable },
				);

				if (!explicitApiKey) {
					recordProviderKeyFailure("openai", candidate, reqErr);
				}

				if (retryable && attempt < maxAttempts - 1) {
					continue;
				}

				throw reqErr;
			}

			if (!response.body) {
				clearTimeout(timeoutTimer);
				const reqErr = new LlmProviderError("OpenAI response body is null", {
					providerId: "openai",
					statusCode: 502,
					retryable: true,
				});
				if (!explicitApiKey) {
					recordProviderKeyFailure("openai", candidate, reqErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw reqErr;
			}

			if (!explicitApiKey) {
				recordProviderKeySuccess("openai", candidate);
			}

			const pendingToolCalls = new Map<
				number,
				{ id: string; name: string; args: string; started: boolean }
			>();
			let emittedAny = false;

			try {
				const sseStream = parseSseStream(response.body, controller.signal);

				for await (const frame of sseStream) {
					if (frame.data === "[DONE]") {
						for (const [index, tc] of pendingToolCalls.entries()) {
							let parsedArgs: Record<string, unknown> | string = {};
							try {
								parsedArgs = JSON.parse(tc.args || "{}");
							} catch {
								parsedArgs = tc.args;
							}
							emittedAny = true;
							yield {
								type: "tool_call_end",
								id: tc.id || `call_${index}`,
								name: tc.name,
								arguments: parsedArgs,
								index,
							};
						}
						pendingToolCalls.clear();
						emittedAny = true;
						yield { type: "done", stopReason: "stop" };
						return;
					}

					let parsed: any;
					try {
						parsed = JSON.parse(frame.data);
					} catch {
						continue;
					}

					// Check usage payload
					if (parsed.usage) {
						emittedAny = true;
						yield {
							type: "usage",
							inputTokens: parsed.usage.prompt_tokens ?? 0,
							outputTokens: parsed.usage.completion_tokens ?? 0,
							totalTokens: parsed.usage.total_tokens,
						};
					}

					const choice = parsed.choices?.[0];
					if (!choice) continue;

					const delta = choice.delta;
					if (delta) {
						// Thinking / reasoning delta (o1/o3 or compatible)
						if (delta.reasoning_content) {
							emittedAny = true;
							yield {
								type: "thinking_delta",
								text: delta.reasoning_content,
							};
						} else if (delta.reasoning) {
							emittedAny = true;
							yield {
								type: "thinking_delta",
								text: delta.reasoning,
							};
						}

						// Content delta
						if (delta.content) {
							emittedAny = true;
							yield {
								type: "text_delta",
								text: delta.content,
							};
						}

						// Tool calls streaming
						if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
							for (const tc of delta.tool_calls) {
								const index = tc.index ?? 0;
								const existing = pendingToolCalls.get(index) ?? {
									id: "",
									name: "",
									args: "",
									started: false,
								};

								if (tc.id) existing.id = tc.id;
								if (tc.function?.name) existing.name = tc.function.name;

								if (!existing.started && (existing.id || existing.name)) {
									existing.started = true;
									emittedAny = true;
									yield {
										type: "tool_call_start",
										id: existing.id || `call_${index}`,
										name: existing.name,
										index,
									};
								}

								if (tc.function?.arguments) {
									existing.args += tc.function.arguments;
									emittedAny = true;
									yield {
										type: "tool_call_delta",
										id: existing.id,
										name: existing.name,
										argumentsDelta: tc.function.arguments,
										index,
									};
								}

								pendingToolCalls.set(index, existing);
							}
						}
					}

					if (choice.finish_reason) {
						for (const [index, tc] of pendingToolCalls.entries()) {
							let parsedArgs: Record<string, unknown> | string = {};
							try {
								parsedArgs = JSON.parse(tc.args || "{}");
							} catch {
								parsedArgs = tc.args;
							}
							emittedAny = true;
							yield {
								type: "tool_call_end",
								id: tc.id || `call_${index}`,
								name: tc.name,
								arguments: parsedArgs,
								index,
							};
						}
						pendingToolCalls.clear();
						emittedAny = true;
						yield {
							type: "done",
							stopReason: choice.finish_reason,
						};
						return;
					}
				}
				return;
			} catch (streamErr: unknown) {
				if (emittedAny) {
					throw streamErr;
				}
				if (!explicitApiKey) {
					recordProviderKeyFailure("openai", candidate, streamErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw streamErr;
			} finally {
				clearTimeout(timeoutTimer);
			}
		}

		throw new LlmProviderError("All OpenAI key candidates exhausted", {
			providerId: "openai",
			statusCode: 429,
			retryable: true,
		});
	}
}
