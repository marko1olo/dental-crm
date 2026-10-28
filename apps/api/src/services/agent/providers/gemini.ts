/**
 * gemini.ts — Google Gemini LLM Provider Adapter.
 * Supports gemini-2.5-flash, gemini-3.5-flash, gemini-3.6-flash, gemini-2.0-flash with native REST & SSE streaming.
 *
 * Mandate 8b: Monolith decomposed into geminiModules (<= 300 lines).
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
	filterActiveModelCascade,
	getProviderKeyCandidates,
	keyRetryLimit,
	recordModelFailure,
	recordModelSuccess,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	type SpeechProviderKeyCandidate,
} from "../../../speech/keyPool.js";
import { createProxiedFetch, getGlobalProxyUrl } from "../proxyDispatcher.js";
import {
	DEFAULT_GEMINI_MODEL_CASCADE,
	formatGeminiContents,
	formatGeminiFunctionDeclarations,
} from "./geminiModules/geminiFormatter.js";
import { parseGeminiSseChunks } from "./geminiModules/geminiSseParser.js";

export { DEFAULT_GEMINI_MODEL_CASCADE };

export class GeminiProviderAdapter implements LlmProviderAdapter {
	public readonly providerId: LlmProviderId = "gemini";
	public readonly defaultModel: string = "gemini-3.5-flash-lite";
	public readonly supportedModels: readonly string[] = [
		"gemini-3.5-flash-lite",
		"gemini-3.1-flash-lite",
		"gemini-3.8-flash",
		"gemini-3.7-flash",
		"gemini-3.6-flash",
		"gemini-3.5-flash",
		"gemini-3.1-pro",
		"gemini-3.1-pro-preview",
		"gemini-2.5-flash",
		"gemini-2.5-pro",
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
		const explicitApiKey = config?.apiKey;

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

		const requestedModel = options.modelId || config?.modelId;
		const baseCascade: string[] = requestedModel
			? [
					requestedModel,
					...DEFAULT_GEMINI_MODEL_CASCADE.filter((m) => m !== requestedModel),
				]
			: [...DEFAULT_GEMINI_MODEL_CASCADE];

		const activeCascade = filterActiveModelCascade(baseCascade);
		const timeoutMs = options.timeoutMs ?? config?.timeoutMs ?? 60_000;
		const proxyUrl =
			config?.proxyUrl ||
			getGlobalProxyUrl("gemini") ||
			getGlobalProxyUrl("google");
		const fetchFn = options.fetchFn ?? createProxiedFetch(proxyUrl);

		const contents = formatGeminiContents(messages);
		const functionDeclarations = formatGeminiFunctionDeclarations(tools);

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

		const triedFingerprints = new Set<string>();
		let lastError: unknown = null;

		for (const currentModel of activeCascade) {
			const maxKeyAttempts = explicitApiKey
				? 1
				: Math.max(
						1,
						Math.min(
							candidates.length,
							keyRetryLimit("gemini") || candidates.length,
						),
					);

			for (let attempt = 0; attempt < maxKeyAttempts; attempt++) {
				const candidate = explicitApiKey
					? (attempt === 0 ? candidates[0] : null)
					: selectProviderKey("gemini", triedFingerprints, "round_robin");

				if (!candidate) break;
				triedFingerprints.add(candidate.fingerprint);
				const apiKey = candidate.value;

				const controller = new AbortController();
				const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);
				if (options.signal) {
					options.signal.addEventListener("abort", () => controller.abort());
				}

				const endpointUrl = `${baseUrl}/v1beta/models/${currentModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

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
							? `Gemini request timed out after ${timeoutMs}ms (model: ${currentModel})`
							: `Gemini connection failed: ${err instanceof Error ? err.message : String(err)}`,
						{
							providerId: "gemini",
							statusCode: isAbort ? 408 : null,
							retryable: true,
						},
					);
					lastError = reqErr;
					if (!explicitApiKey) {
						recordProviderKeyFailure("gemini", candidate, reqErr);
					}
					if (explicitApiKey) throw reqErr;
					continue;
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
					const isRateLimit =
						statusCode === 429 ||
						/resource_exhausted|quota|rate limit/i.test(errorBody);
					const isModelOverloaded =
						statusCode === 503 || statusCode === 504 || statusCode === 404;

					const reqErr = new LlmProviderError(
						`Gemini HTTP ${statusCode} (model: ${currentModel}): ${errorBody.slice(0, 300)}`,
						{
							providerId: "gemini",
							statusCode,
							retryable: isRateLimit || isModelOverloaded || statusCode >= 500,
						},
					);
					lastError = reqErr;

					if (isModelOverloaded) {
						recordModelFailure(currentModel, reqErr);
						triedFingerprints.clear();
						break;
					}

					if (!explicitApiKey) {
						recordProviderKeyFailure("gemini", candidate, reqErr);
					}

					if (isRateLimit) {
						if (explicitApiKey) throw reqErr;
						console.warn(
							`[GeminiProvider] Key ${candidate.fingerprint} rate limited (429) on model ${currentModel}. Swapping key...`,
						);
						continue;
					}

					if (statusCode === 401 || statusCode === 403 || statusCode >= 500) {
						if (explicitApiKey) throw reqErr;
						continue;
					}

					throw reqErr;
				}

				if (!response.body) {
					clearTimeout(timeoutTimer);
					const reqErr = new LlmProviderError(
						`Gemini response body is null (model: ${currentModel})`,
						{ providerId: "gemini", statusCode: 502, retryable: true },
					);
					lastError = reqErr;
					if (!explicitApiKey) {
						recordProviderKeyFailure("gemini", candidate, reqErr);
					}
					continue;
				}

				if (!explicitApiKey) {
					recordProviderKeySuccess("gemini", candidate);
				}
				recordModelSuccess(currentModel);

				let emittedAny = false;
				try {
					yield* parseGeminiSseChunks(
						response.body,
						controller.signal,
						() => { emittedAny = true; },
					);
					return;
				} catch (streamErr: unknown) {
					if (emittedAny) throw streamErr;
					lastError = streamErr;
					if (!explicitApiKey) {
						recordProviderKeyFailure("gemini", candidate, streamErr);
					}
					continue;
				} finally {
					clearTimeout(timeoutTimer);
				}
			}
		}

		throw lastError instanceof LlmProviderError
			? lastError
			: new LlmProviderError(
					`All Gemini models and keys exhausted: ${lastError instanceof Error ? lastError.message : String(lastError || "no healthy models/keys")}`,
					{
						providerId: "gemini",
						statusCode: 429,
						retryable: true,
					},
				);
	}
}
