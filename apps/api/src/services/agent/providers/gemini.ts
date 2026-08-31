/**
 * gemini.ts — Google Gemini LLM Provider Adapter.
 * Supports gemini-2.5-flash, gemini-3.5-flash, gemini-3.6-flash, gemini-2.0-flash with native REST & SSE streaming.
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

export class GeminiProviderAdapter implements LlmProviderAdapter {
	public readonly providerId: LlmProviderId = "gemini";
	public readonly defaultModel: string = "gemini-3.5-flash-lite";
	public readonly supportedModels: readonly string[] = [
		"gemini-3.5-flash-lite",
		"gemini-2.5-flash",
		"gemini-3.1-flash-lite",
		"gemini-3.7-flash",
		"gemini-3.6-flash",
		"gemini-3.5-flash",
		"gemini-3.1-pro-preview",
		"gemini-2.0-flash",
		"gemini-2.0-flash-exp",
		"gemini-1.5-pro",
		"gemini-1.5-flash",
	] as const;

	public async *chatStream(
		messages: ProviderMessage[],
		tools: (AgentTool | Record<string, unknown>)[],
		options: ChatOptions,
	): AsyncIterable<LlmStreamChunk> {
		const config = options.clinicAiSettings?.providers?.gemini;
		const explicitApiKey =
			config?.apiKey ||
			process.env.GEMINI_API_KEY ||
			process.env.GOOGLE_API_KEY;

		const candidates: SpeechProviderKeyCandidate[] = explicitApiKey
			? [
					{
						value: explicitApiKey,
						fingerprint: "explicit",
						source: "config",
						ordinal: 1,
					},
				]
			: getProviderKeyCandidates("gemini");

		if (candidates.length === 0) {
			throw new LlmProviderError(
				"GEMINI_API_KEY / GOOGLE_API_KEY is not configured in clinicAiSettings or environment",
				{ providerId: "gemini", statusCode: 401, retryable: true },
			);
		}

		const baseUrl = (
			config?.baseUrl ||
			process.env.GEMINI_BASE_URL ||
			"https://generativelanguage.googleapis.com"
		).replace(/\/+$/, "");

		const model = options.modelId || config?.modelId || this.defaultModel;
		const timeoutMs = options.timeoutMs ?? config?.timeoutMs ?? 60_000;
		const proxyUrl =
			config?.proxyUrl ||
			getGlobalProxyUrl("gemini") ||
			getGlobalProxyUrl("google");
		const fetchFn = options.fetchFn ?? createProxiedFetch(proxyUrl);

		// Format contents for Gemini REST API
		const contents: Array<{
			role: "user" | "model";
			parts: Array<
				| { text: string }
				| { functionCall: { name: string; args: Record<string, unknown> } }
				| { functionResponse: { name: string; response: Record<string, unknown> } }
			>;
		}> = [];

		for (const msg of messages) {
			if (msg.role === "system") {
				continue; // Handled in systemInstruction
			}

			if (typeof msg.content === "string") {
				contents.push({
					role: msg.role === "assistant" ? "model" : "user",
					parts: [{ text: msg.content }],
				});
				continue;
			}

			if (Array.isArray(msg.content)) {
				const parts: Array<
					| { text: string }
					| { functionCall: { name: string; args: Record<string, unknown> } }
					| { functionResponse: { name: string; response: Record<string, unknown> } }
				> = [];

				for (const block of msg.content) {
					if (block.type === "text") {
						parts.push({ text: block.text });
					} else if (block.type === "tool_use") {
						parts.push({
							functionCall: {
								name: block.name,
								args: block.input,
							},
						});
					} else if (block.type === "tool_result") {
						parts.push({
							functionResponse: {
								name: block.toolCallId,
								response:
									typeof block.content === "object" && block.content !== null
										? (block.content as Record<string, unknown>)
										: { output: block.content },
							},
						});
					}
				}

				if (parts.length > 0) {
					const hasFunctionResponse = parts.some((p) => "functionResponse" in p);
					const role = hasFunctionResponse
						? "user"
						: msg.role === "assistant"
							? "model"
							: "user";
					contents.push({ role, parts });
				}
			}
		}

		if (contents.length === 0) {
			contents.push({ role: "user", parts: [{ text: "Привет" }] });
		}

		// Format tools for Gemini functionDeclarations
		const functionDeclarations =
			tools.length > 0
				? tools.map((t) => {
						if ("function" in t && typeof (t as any).function === "object") {
							const fn = (t as any).function;
							return {
								name: fn.name,
								description: fn.description || "",
								parameters: fn.parameters,
							};
						}
						const agentTool = t as AgentTool;
						let parameters = agentTool.parameters;
						if (parameters && typeof (parameters as any).safeParse === "function") {
							parameters = zodToJsonSchema(parameters as any);
						}
						return {
							name: agentTool.name,
							description: agentTool.description || "",
							parameters: parameters || {
								type: "object",
								properties: {},
							},
						};
					})
				: undefined;

		const generationConfig: Record<string, unknown> = {
			temperature: options.temperature ?? config?.temperature ?? 0.2,
			...(options.maxTokens || config?.maxTokens
				? { maxOutputTokens: options.maxTokens ?? config?.maxTokens }
				: {}),
		};

		if (options.responseFormat?.type === "json_object") {
			generationConfig.responseMimeType = "application/json";
		}

		const payload: Record<string, unknown> = {
			contents,
			generationConfig,
		};

		if (options.system) {
			payload.systemInstruction = {
				parts: [{ text: options.system }],
			};
		}

		if (functionDeclarations && functionDeclarations.length > 0) {
			payload.tools = [{ functionDeclarations }];
		}

		const maxAttempts = explicitApiKey
			? 1
			: Math.max(1, Math.min(candidates.length, keyRetryLimit("gemini") || candidates.length));
		const triedFingerprints = new Set<string>();

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const candidate = explicitApiKey
				? candidates[0]
				: selectProviderKey("gemini", triedFingerprints, "round_robin");

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

			const endpointUrl = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

			let response: Response;
			try {
				response = await fetchFn(endpointUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-goog-api-key": apiKey,
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
						? `Gemini request timed out after ${timeoutMs}ms`
						: `Gemini connection failed: ${err instanceof Error ? err.message : String(err)}`,
					{
						providerId: "gemini",
						statusCode: isAbort ? 408 : null,
						retryable: true,
					},
				);
				if (!explicitApiKey) {
					recordProviderKeyFailure("gemini", candidate, reqErr);
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
					`Gemini HTTP ${statusCode}: ${errorBody.slice(0, 300)}`,
					{ providerId: "gemini", statusCode, retryable },
				);

				if (!explicitApiKey) {
					recordProviderKeyFailure("gemini", candidate, reqErr);
				}

				if (retryable && attempt < maxAttempts - 1) {
					continue;
				}

				throw reqErr;
			}

			if (!response.body) {
				clearTimeout(timeoutTimer);
				const reqErr = new LlmProviderError("Gemini response body is null", {
					providerId: "gemini",
					statusCode: 502,
					retryable: true,
				});
				if (!explicitApiKey) {
					recordProviderKeyFailure("gemini", candidate, reqErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw reqErr;
			}

			if (!explicitApiKey) {
				recordProviderKeySuccess("gemini", candidate);
			}

			let toolCallIndex = 0;
			let emittedAny = false;

			try {
				const sseStream = parseSseStream(response.body, controller.signal);

				for await (const frame of sseStream) {
					let parsed: any;
					try {
						parsed = JSON.parse(frame.data);
					} catch {
						continue;
					}

					if (parsed.usageMetadata) {
						emittedAny = true;
						yield {
							type: "usage",
							inputTokens: parsed.usageMetadata.promptTokenCount ?? 0,
							outputTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
							totalTokens: parsed.usageMetadata.totalTokenCount,
						};
					}

					const candidateObj = parsed.candidates?.[0];
					if (!candidateObj) continue;

					const parts = candidateObj.content?.parts;
					if (Array.isArray(parts)) {
						for (const part of parts) {
							if (part.text) {
								emittedAny = true;
								yield {
									type: "text_delta",
									text: part.text,
								};
							}

							if (part.functionCall) {
								emittedAny = true;
								const callId = `gemini_call_${Date.now()}_${toolCallIndex}`;
								const fnName = part.functionCall.name;
								const fnArgs = part.functionCall.args ?? {};

								yield {
									type: "tool_call_start",
									id: callId,
									name: fnName,
									index: toolCallIndex,
								};

								yield {
									type: "tool_call_delta",
									id: callId,
									name: fnName,
									argumentsDelta: JSON.stringify(fnArgs),
									index: toolCallIndex,
								};

								yield {
									type: "tool_call_end",
									id: callId,
									name: fnName,
									arguments: fnArgs,
									index: toolCallIndex,
								};

								toolCallIndex++;
							}
						}
					}

					if (candidateObj.finishReason) {
						emittedAny = true;
						yield {
							type: "done",
							stopReason: candidateObj.finishReason.toLowerCase(),
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
					recordProviderKeyFailure("gemini", candidate, streamErr);
				}
				if (attempt < maxAttempts - 1) {
					continue;
				}
				throw streamErr;
			} finally {
				clearTimeout(timeoutTimer);
			}
		}

		throw new LlmProviderError("All Gemini key candidates exhausted", {
			providerId: "gemini",
			statusCode: 429,
			retryable: true,
		});
	}
}
