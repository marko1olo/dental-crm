/**
 * deepseek.ts — DeepSeek LLM Provider Adapter.
 * Supports deepseek-chat (V3) and deepseek-reasoner (R1) with reasoning_content thinking streaming.
 *
 * Mandate 8b: Monolith decomposed into deepseekModules (<= 300 lines).
 */

import type { ProviderMessage } from "../types.js";
import type {
	AgentTool,
	ChatOptions,
	LlmProviderAdapter,
	LlmProviderId,
	LlmStreamChunk,
} from "../omniGatewayTypes.js";
import { LlmProviderError } from "../omniGatewayTypes.js";
import {
	getProviderKeyCandidates,
	keyRetryLimit,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	type SpeechProviderKeyCandidate,
} from "../../../speech/keyPool.js";
import { createProxiedFetch, getGlobalProxyUrl } from "../proxyDispatcher.js";
import {
	DEFAULT_AGENTROUTER_BASE_URL,
	DEFAULT_AGENTROUTER_MODEL,
	parseApiKeys,
} from "../../../ai/agentRouterClient.js";
import {
	formatDeepSeekMessages,
	formatDeepSeekTools,
} from "./deepseekModules/deepseekFormatter.js";
import { streamDeepSeekAgentRouter } from "./deepseekModules/deepseekAgentRouter.js";
import { parseDeepSeekSseChunks } from "./deepseekModules/deepseekSseParser.js";

export class DeepSeekProviderAdapter implements LlmProviderAdapter {
	public readonly providerId: LlmProviderId = "deepseek";
	public readonly defaultModel: string = "deepseek-chat";
	public readonly supportedModels: readonly string[] = [
		"deepseek-chat",
		"deepseek-reasoner",
		"deepseek-v4-flash",
	] as const;

	public async *chatStream(
		messages: ProviderMessage[],
		tools: (AgentTool | Record<string, unknown>)[],
		options: ChatOptions,
	): AsyncIterable<LlmStreamChunk> {
		const config = options.clinicAiSettings?.providers?.deepseek;
		const explicitApiKey = config?.apiKey || process.env.DEEPSEEK_API_KEY;

		const useAgentRouter = Boolean(
			options.modelId === "deepseek-v4-flash" ||
			config?.baseUrl?.includes("agentrouter") ||
			process.env.AGENTROUTER_BASE_URL?.includes("agentrouter") ||
			(!explicitApiKey && process.env.AGENTROUTER_API_KEYS),
		);

		const candidates: SpeechProviderKeyCandidate[] = explicitApiKey
			? [
					{
						value: explicitApiKey,
						fingerprint: "explicit",
						source: "config",
						ordinal: 1,
					},
				]
			: getProviderKeyCandidates("deepseek");

		if (!useAgentRouter && candidates.length === 0) {
			throw new LlmProviderError(
				"DEEPSEEK_API_KEY is not configured in clinicAiSettings or environment",
				{ providerId: "deepseek", statusCode: 401, retryable: true },
			);
		}

		const baseUrl = (
			config?.baseUrl ||
			process.env.DEEPSEEK_BASE_URL ||
			"https://api.deepseek.com/v1"
		).replace(/\/+$/, "");

		const model = options.modelId || config?.modelId || this.defaultModel;
		const isReasoner = model === "deepseek-reasoner" || model.includes("reasoner");
		const timeoutMs = options.timeoutMs ?? config?.timeoutMs ?? 90_000;
		const proxyUrl = config?.proxyUrl || getGlobalProxyUrl("deepseek");
		const fetchFn = options.fetchFn ?? createProxiedFetch(proxyUrl);

		const formattedMessages = formatDeepSeekMessages(messages, options, isReasoner);
		const formattedTools = formatDeepSeekTools(tools, isReasoner);

		if (useAgentRouter) {
			const routerBaseUrl = (
				config?.baseUrl ||
				process.env.AGENTROUTER_BASE_URL ||
				DEFAULT_AGENTROUTER_BASE_URL
			).replace(/\/+$/, "");

			const routerModel =
				options.modelId ||
				config?.modelId ||
				process.env.AGENTROUTER_MODEL ||
				DEFAULT_AGENTROUTER_MODEL;

			const routerKeys = explicitApiKey
				? [explicitApiKey]
				: parseApiKeys(process.env.AGENTROUTER_API_KEYS);

			yield* streamDeepSeekAgentRouter({
				formattedMessages,
				formattedTools,
				options,
				routerBaseUrl,
				routerModel,
				routerKeys,
				proxyUrl,
				timeoutMs,
			});
			return;
		}

		const payload: Record<string, unknown> = {
			model,
			messages: formattedMessages,
			stream: true,
			...(options.responseFormat?.type === "json_object"
				? { response_format: { type: "json_object" } }
				: {}),
		};

		if (!isReasoner) {
			payload.temperature = options.temperature ?? config?.temperature ?? 0.2;
		}

		if (options.maxTokens || config?.maxTokens) {
			payload.max_tokens = options.maxTokens ?? config?.maxTokens;
		}

		if (formattedTools && formattedTools.length > 0) {
			payload.tools = formattedTools;
		}

		const maxAttempts = explicitApiKey
			? 1
			: Math.max(1, Math.min(candidates.length, keyRetryLimit("deepseek") || candidates.length));
		const triedFingerprints = new Set<string>();

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const candidate = explicitApiKey
				? candidates[0]
				: selectProviderKey("deepseek", triedFingerprints, "round_robin");

			if (!candidate) break;
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
						? `DeepSeek request timed out after ${timeoutMs}ms`
						: `DeepSeek connection failed: ${err instanceof Error ? err.message : String(err)}`,
					{
						providerId: "deepseek",
						statusCode: isAbort ? 408 : null,
						retryable: true,
					},
				);
				if (!explicitApiKey) {
					recordProviderKeyFailure("deepseek", candidate, reqErr);
				}
				if (attempt < maxAttempts - 1) continue;
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
					`DeepSeek HTTP ${statusCode}: ${errorBody.slice(0, 300)}`,
					{ providerId: "deepseek", statusCode, retryable },
				);

				if (!explicitApiKey) {
					recordProviderKeyFailure("deepseek", candidate, reqErr);
				}

				if (retryable && attempt < maxAttempts - 1) continue;
				throw reqErr;
			}

			if (!response.body) {
				clearTimeout(timeoutTimer);
				const reqErr = new LlmProviderError("DeepSeek response body is null", {
					providerId: "deepseek",
					statusCode: 502,
					retryable: true,
				});
				if (!explicitApiKey) {
					recordProviderKeyFailure("deepseek", candidate, reqErr);
				}
				if (attempt < maxAttempts - 1) continue;
				throw reqErr;
			}

			if (!explicitApiKey) {
				recordProviderKeySuccess("deepseek", candidate);
			}

			let emittedAny = false;
			try {
				yield* parseDeepSeekSseChunks(
					response.body,
					controller.signal,
					() => { emittedAny = true; },
				);
				return;
			} catch (streamErr: unknown) {
				if (emittedAny) throw streamErr;
				if (!explicitApiKey) {
					recordProviderKeyFailure("deepseek", candidate, streamErr);
				}
				if (attempt < maxAttempts - 1) continue;
				throw streamErr;
			} finally {
				clearTimeout(timeoutTimer);
			}
		}

		throw new LlmProviderError("All DeepSeek key candidates exhausted", {
			providerId: "deepseek",
			statusCode: 429,
			retryable: true,
		});
	}
}
