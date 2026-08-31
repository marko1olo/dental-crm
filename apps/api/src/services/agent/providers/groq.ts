/**
 * groq.ts — Groq LLM Provider Adapter.
 * Supports llama-3.3-70b-versatile, llama-3.1-8b-instant, and deepseek-r1-distill-llama-70b with ultra-low latency streaming.
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

export class GroqProviderAdapter implements LlmProviderAdapter {
	public readonly providerId: LlmProviderId = "groq";
	public readonly defaultModel: string = "qwen/qwen3.8-27b";
	public readonly supportedModels: readonly string[] = [
		"whisper-large-v3-turbo",
		"qwen/qwen3.8-27b",
		"openai/gpt-oss-120b",
		"openai/gpt-oss-20b",
		"qwen/qwen3.6-27b",
		"groq/compound",
		"groq/compound-mini",
		"llama-3.3-70b-versatile",
		"llama-3.1-8b-instant",
	] as const;

	public async *chatStream(
		messages: ProviderMessage[],
		tools: (AgentTool | Record<string, unknown>)[],
		options: ChatOptions,
	): AsyncIterable<LlmStreamChunk> {
		const config = options.clinicAiSettings?.providers?.groq;
		const explicitApiKey = config?.apiKey || process.env.GROQ_API_KEY;

		const candidates: SpeechProviderKeyCandidate[] = explicitApiKey
			? [
					{
						value: explicitApiKey,
						fingerprint: "explicit",
						source: "config",
						ordinal: 1,
					},
				]
			: getProviderKeyCandidates("groq");

		if (candidates.length === 0) {
			throw new LlmProviderError(
				"GROQ_API_KEY is not configured in clinicAiSettings or environment",
				{ providerId: "groq", statusCode: 401, retryable: true },
			);
		}

		const baseUrl = (
			config?.baseUrl ||
			process.env.GROQ_BASE_URL ||
			"https://api.groq.com/openai/v1"
		).replace(/\/+$/, "");

		const model = options.modelId || config?.modelId || this.defaultModel;
		const timeoutMs = options.timeoutMs ?? config?.timeoutMs ?? 45_000;
		const proxyUrl =
			config?.proxyUrl ||
			getGlobalProxyUrl("groq");
		const fetchFn = options.fetchFn ?? createProxiedFetch(proxyUrl);

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
				role: "system",
				content: options.system,
			});
		}

		for (const msg of messages) {
			if (typeof msg.content === "string") {
				formattedMessages.push({
					role: msg.role,
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

		// Format tools
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
			temperature: options.temperature ?? config?.temperature ?? 0.2,
			max_tokens: options.maxTokens ?? config?.maxTokens ?? 4096,
			...(options.responseFormat?.type === "json_object"
				? { response_format: { type: "json_object" } }
				: {}),
		};

		if (formattedTools && formattedTools.length > 0) {
			payload.tools = formattedTools;
		}

		const maxAttempts = explicitApiKey
			? 1
			: Math.max(1, Math.min(candidates.length, keyRetryLimit("groq") || candidates.length));
		const triedFingerprints = new Set<string>();

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const candidate = explicitApiKey
				? candidates[0]
				: selectProviderKey("groq", triedFingerprints, "round_robin");

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
						? `Groq request timed out after ${timeoutMs}ms`
						: `Groq connection failed: ${err instanceof Error ? err.message : String(err)}`,
					{
						providerId: "groq",
						statusCode: isAbort ? 408 : null,
						retryable: true,
					},
				);
				if (!explicitApiKey) {
					recordProviderKeyFailure("groq", candidate, reqErr);
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
					`Groq HTTP ${statusCode}: ${errorBody.slice(0, 300)}`,
					{ providerId: "groq", statusCode, retryable },
				);

				if (!explicitApiKey) {
					recordProviderKeyFailure("groq", candidate, reqErr);
				}

				if (retryable && attempt < maxAttempts - 1) {
					continue;
				}

				throw reqErr;
			}

			if (!response.body) {
				clearTimeout(timeoutTimer);
				const reqErr = new LlmProviderError("Groq response body is null", {
					providerId: "groq",
					statusCode: 502,
					retryable: true,
				});
				if (!explicitApiKey) {
					recordProviderKeyFailure("groq", candidate, reqErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw reqErr;
			}

			if (!explicitApiKey) {
				recordProviderKeySuccess("groq", candidate);
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
						// Thinking / reasoning (e.g. deepseek-r1-distill on groq)
						if (delta.reasoning) {
							emittedAny = true;
							yield { type: "thinking_delta", text: delta.reasoning };
						}

						if (delta.content) {
							emittedAny = true;
							yield { type: "text_delta", text: delta.content };
						}

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
					recordProviderKeyFailure("groq", candidate, streamErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw streamErr;
			} finally {
				clearTimeout(timeoutTimer);
			}
		}

		throw new LlmProviderError("All Groq key candidates exhausted", {
			providerId: "groq",
			statusCode: 429,
			retryable: true,
		});
	}
}
