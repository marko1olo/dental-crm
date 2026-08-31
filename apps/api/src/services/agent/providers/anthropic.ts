/**
 * anthropic.ts — Anthropic Claude LLM Provider Adapter.
 * Supports claude-3-7-sonnet-20250219, claude-3-5-sonnet, claude-3-5-haiku with native tool use and thinking blocks.
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

export class AnthropicProviderAdapter implements LlmProviderAdapter {
	public readonly providerId: LlmProviderId = "anthropic";
	public readonly defaultModel: string = "claude-3-7-sonnet-20250219";
	public readonly supportedModels: readonly string[] = [
		"claude-3-7-sonnet-20250219",
		"claude-3-5-sonnet-20241022",
		"claude-3-5-haiku-20241022",
		"claude-3-opus-20240229",
	] as const;

	public async *chatStream(
		messages: ProviderMessage[],
		tools: (AgentTool | Record<string, unknown>)[],
		options: ChatOptions,
	): AsyncIterable<LlmStreamChunk> {
		const config = options.clinicAiSettings?.providers?.anthropic;
		const explicitApiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;

		const candidates: SpeechProviderKeyCandidate[] = explicitApiKey
			? [
					{
						value: explicitApiKey,
						fingerprint: "explicit",
						source: "config",
						ordinal: 1,
					},
				]
			: getProviderKeyCandidates("anthropic");

		if (candidates.length === 0) {
			throw new LlmProviderError(
				"ANTHROPIC_API_KEY is not configured in clinicAiSettings or environment",
				{ providerId: "anthropic", statusCode: 401, retryable: true },
			);
		}

		const baseUrl = (
			config?.baseUrl ||
			process.env.ANTHROPIC_BASE_URL ||
			"https://api.anthropic.com/v1"
		).replace(/\/+$/, "");

		const model = options.modelId || config?.modelId || this.defaultModel;
		const timeoutMs = options.timeoutMs ?? config?.timeoutMs ?? 60_000;
		const proxyUrl =
			config?.proxyUrl ||
			getGlobalProxyUrl("anthropic");
		const fetchFn = options.fetchFn ?? createProxiedFetch(proxyUrl);

		// Format system prompt
		const systemPrompt = options.system || undefined;

		// Format messages for Anthropic Messages API
		const formattedMessages: Array<{
			role: "user" | "assistant";
			content:
				| string
				| Array<
						| { type: "text"; text: string }
						| { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
						| { type: "tool_result"; tool_use_id: string; content: string }
				  >;
		}> = [];

		for (const msg of messages) {
			if (msg.role === "system") {
				continue; // System prompt is sent separately in Anthropic Messages API
			}

			const role: "user" | "assistant" =
				msg.role === "assistant" ? "assistant" : "user";

			if (typeof msg.content === "string") {
				formattedMessages.push({
					role,
					content: msg.content,
				});
				continue;
			}

			if (Array.isArray(msg.content)) {
				const blocks: Array<
					| { type: "text"; text: string }
					| { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
					| { type: "tool_result"; tool_use_id: string; content: string }
				> = [];

				for (const block of msg.content) {
					if (block.type === "text") {
						blocks.push({ type: "text", text: block.text });
					} else if (block.type === "tool_use") {
						blocks.push({
							type: "tool_use",
							id: block.id,
							name: block.name,
							input: block.input,
						});
					} else if (block.type === "tool_result") {
						blocks.push({
							type: "tool_result",
							tool_use_id: block.toolCallId,
							content:
								typeof block.content === "string"
									? block.content
									: JSON.stringify(block.content),
						});
					}
				}

				if (blocks.length > 0) {
					formattedMessages.push({ role, content: blocks });
				}
			}
		}

		// Ensure messages are not empty
		if (formattedMessages.length === 0) {
			formattedMessages.push({ role: "user", content: "Привет" });
		}

		// Format tools for Anthropic
		const formattedTools =
			tools.length > 0
				? tools.map((t) => {
						if ("input_schema" in t && typeof t.name === "string") {
							return t;
						}
						const agentTool = t as AgentTool;
						let parameters = agentTool.parameters;
						if (parameters && typeof (parameters as any).safeParse === "function") {
							parameters = zodToJsonSchema(parameters as any);
						}
						return {
							name: agentTool.name,
							description: agentTool.description ?? "",
							input_schema: parameters ?? {
								type: "object",
								properties: {},
							},
						};
					})
				: undefined;

		const payload: Record<string, unknown> = {
			model,
			messages: formattedMessages,
			max_tokens: options.maxTokens ?? config?.maxTokens ?? 4096,
			stream: true,
		};

		if (systemPrompt) {
			payload.system = systemPrompt;
		}

		if (options.temperature !== undefined || config?.temperature !== undefined) {
			payload.temperature = options.temperature ?? config?.temperature;
		}

		if (formattedTools && formattedTools.length > 0) {
			payload.tools = formattedTools;
		}

		const maxAttempts = explicitApiKey
			? 1
			: Math.max(1, Math.min(candidates.length, keyRetryLimit("anthropic") || candidates.length));
		const triedFingerprints = new Set<string>();

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const candidate = explicitApiKey
				? candidates[0]
				: selectProviderKey("anthropic", triedFingerprints, "round_robin");

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
				response = await fetchFn(`${baseUrl}/messages`, {
					method: "POST",
					headers: {
						"x-api-key": apiKey,
						"anthropic-version": "2023-06-01",
						"content-type": "application/json",
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
						? `Anthropic request timed out after ${timeoutMs}ms`
						: `Anthropic connection failed: ${err instanceof Error ? err.message : String(err)}`,
					{
						providerId: "anthropic",
						statusCode: isAbort ? 408 : null,
						retryable: true,
					},
				);
				if (!explicitApiKey) {
					recordProviderKeyFailure("anthropic", candidate, reqErr);
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
					`Anthropic HTTP ${statusCode}: ${errorBody.slice(0, 300)}`,
					{ providerId: "anthropic", statusCode, retryable },
				);

				if (!explicitApiKey) {
					recordProviderKeyFailure("anthropic", candidate, reqErr);
				}

				if (retryable && attempt < maxAttempts - 1) {
					continue;
				}

				throw reqErr;
			}

			if (!response.body) {
				clearTimeout(timeoutTimer);
				const reqErr = new LlmProviderError("Anthropic response body is null", {
					providerId: "anthropic",
					statusCode: 502,
					retryable: true,
				});
				if (!explicitApiKey) {
					recordProviderKeyFailure("anthropic", candidate, reqErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw reqErr;
			}

			if (!explicitApiKey) {
				recordProviderKeySuccess("anthropic", candidate);
			}

			let inputTokens = 0;
			let outputTokens = 0;
			let stopReason = "stop";
			let emittedAny = false;

			const activeBlocks = new Map<
				number,
				{
					type: "text" | "tool_use" | "thinking";
					id: string;
					name: string;
					jsonArgs: string;
				}
			>();

			try {
				const sseStream = parseSseStream(response.body, controller.signal);

				for await (const frame of sseStream) {
					let parsed: any;
					try {
						parsed = JSON.parse(frame.data);
					} catch {
						continue;
					}

					const eventType = frame.event || parsed.type;

					if (eventType === "message_start") {
						inputTokens = parsed.message?.usage?.input_tokens ?? 0;
					} else if (eventType === "content_block_start") {
						const index = parsed.index ?? 0;
						const block = parsed.content_block;
						if (block?.type === "tool_use") {
							activeBlocks.set(index, {
								type: "tool_use",
								id: block.id ?? `call_${index}`,
								name: block.name ?? "",
								jsonArgs: "",
							});
							emittedAny = true;
							yield {
								type: "tool_call_start",
								id: block.id ?? `call_${index}`,
								name: block.name ?? "",
								index,
							};
						} else if (block?.type === "thinking") {
							activeBlocks.set(index, {
								type: "thinking",
								id: "",
								name: "",
								jsonArgs: "",
							});
						} else {
							activeBlocks.set(index, {
								type: "text",
								id: "",
								name: "",
								jsonArgs: "",
							});
						}
					} else if (eventType === "content_block_delta") {
						const index = parsed.index ?? 0;
						const delta = parsed.delta;
						const block = activeBlocks.get(index);

						if (delta?.type === "text_delta" && delta.text) {
							emittedAny = true;
							yield { type: "text_delta", text: delta.text };
						} else if (delta?.type === "input_json_delta" && delta.partial_json) {
							if (block) {
								block.jsonArgs += delta.partial_json;
							}
							emittedAny = true;
							yield {
								type: "tool_call_delta",
								...(block?.id !== undefined ? { id: block.id } : {}),
								...(block?.name !== undefined ? { name: block.name } : {}),
								argumentsDelta: delta.partial_json,
								index,
							};
						} else if (delta?.type === "thinking_delta" && delta.thinking) {
							emittedAny = true;
							yield { type: "thinking_delta", text: delta.thinking };
						}
					} else if (eventType === "content_block_stop") {
						const index = parsed.index ?? 0;
						const block = activeBlocks.get(index);
						if (block?.type === "tool_use") {
							let parsedArgs: Record<string, unknown> | string = {};
							try {
								parsedArgs = JSON.parse(block.jsonArgs || "{}");
							} catch {
								parsedArgs = block.jsonArgs;
							}
							emittedAny = true;
							yield {
								type: "tool_call_end",
								id: block.id,
								name: block.name,
								arguments: parsedArgs,
								index,
							};
						}
						activeBlocks.delete(index);
					} else if (eventType === "message_delta") {
						if (parsed.delta?.stop_reason) {
							stopReason = parsed.delta.stop_reason;
						}
						if (parsed.usage?.output_tokens) {
							outputTokens = parsed.usage.output_tokens;
							emittedAny = true;
							yield {
								type: "usage",
								inputTokens,
								outputTokens,
								totalTokens: inputTokens + outputTokens,
							};
						}
					} else if (eventType === "message_stop") {
						emittedAny = true;
						yield { type: "done", stopReason };
						return;
					} else if (eventType === "error") {
						const errMsg = parsed.error?.message || "Unknown Anthropic stream error";
						throw new LlmProviderError(`Anthropic error: ${errMsg}`, {
							providerId: "anthropic",
							statusCode: 500,
							retryable: true,
						});
					}
				}
				return;
			} catch (streamErr: unknown) {
				if (emittedAny) {
					throw streamErr;
				}
				if (!explicitApiKey) {
					recordProviderKeyFailure("anthropic", candidate, streamErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw streamErr;
			} finally {
				clearTimeout(timeoutTimer);
			}
		}

		throw new LlmProviderError("All Anthropic key candidates exhausted", {
			providerId: "anthropic",
			statusCode: 429,
			retryable: true,
		});
	}
}
