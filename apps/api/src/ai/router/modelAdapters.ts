/**
 * modelAdapters.ts — Request Payload Formatter and Tool Call Argument Parser
 */

import {
	type AgentRouterChatParams,
	type AgentRouterToolCall,
	type GeminiHealthCheckResult,
	DEFAULT_CLINICAL_TEMPERATURE,
	DEFAULT_GEMINI_BASE_URL,
	DEFAULT_GEMINI_MODEL,
	MIN_REASONING_MAX_TOKENS,
	SUPPORTED_GEMINI_MODELS,
} from "./routerTypes.js";
import { maskApiKey } from "./keyPoolManager.js";

/**
 * Checks whether the given model name belongs to Google Gemini family.
 */
export function isGeminiModel(model?: string | null): boolean {
	if (!model || typeof model !== "string") return false;
	const lower = model.toLowerCase();
	return (
		lower.includes("gemini") ||
		lower.includes("gemma") ||
		SUPPORTED_GEMINI_MODELS.some((m) => lower.includes(m))
	);
}

/**
 * Returns the effective base URL for Google Gemini API OpenAI-compatible endpoint.
 */
export function getGeminiBaseUrl(): string {
	const configured =
		process.env.GEMINI_BASE_URL || process.env.GOOGLE_BASE_URL;
	if (configured && typeof configured === "string" && configured.trim()) {
		return configured.trim().replace(/\/+$/, "");
	}
	return DEFAULT_GEMINI_BASE_URL;
}

/**
 * Collects Google Gemini API key candidates from environment variables without throwing.
 */
export function getGeminiApiKeyCandidates(explicitKey?: string | null): string[] {
	if (explicitKey && typeof explicitKey === "string" && explicitKey.trim()) {
		return [explicitKey.trim()];
	}

	const candidates: string[] = [];
	const envKeys = [
		process.env.GEMINI_API_KEY,
		process.env.GOOGLE_API_KEY,
		process.env.GEMINI_API_KEYS,
		process.env.GOOGLE_API_KEYS,
	];

	for (const envVal of envKeys) {
		if (!envVal || typeof envVal !== "string") continue;
		for (const k of envVal.split(",")) {
			const trimmed = k.trim();
			if (trimmed.length > 0 && !candidates.includes(trimmed)) {
				candidates.push(trimmed);
			}
		}
	}

	return candidates;
}

/**
 * Live health-check probe for Google Gemini API key availability without leaking secrets.
 */
export async function validateGeminiApiKeyLive(
	apiKey: string,
	fetchFn: typeof fetch = globalThis.fetch,
	targetModel: string = DEFAULT_GEMINI_MODEL,
): Promise<GeminiHealthCheckResult> {
	const baseUrl = getGeminiBaseUrl();
	const keyMask = maskApiKey(apiKey);
	const start = Date.now();

	if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
		return {
			valid: false,
			model: targetModel,
			keyMask: "gemini...none",
			latencyMs: 0,
			baseUrl,
			error: "Gemini API key is empty or missing",
		};
	}

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);

		// Lightweight probe using chat completions endpoint with 1 token
		const response = await fetchFn(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
				"x-goog-api-key": apiKey,
			},
			body: JSON.stringify({
				model: targetModel,
				messages: [{ role: "user", content: "ping" }],
				max_tokens: 1,
				temperature: 0.1,
			}),
			signal: controller.signal,
		});

		clearTimeout(timeout);
		const latencyMs = Date.now() - start;

		if (response.ok) {
			return {
				valid: true,
				model: targetModel,
				keyMask,
				latencyMs,
				baseUrl,
			};
		}

		const errBody = await response.text().catch(() => "");
		return {
			valid: false,
			model: targetModel,
			keyMask,
			latencyMs,
			baseUrl,
			error: `HTTP ${response.status}: ${errBody.slice(0, 150)}`,
		};
	} catch (err) {
		const latencyMs = Date.now() - start;
		return {
			valid: false,
			model: targetModel,
			keyMask,
			latencyMs,
			baseUrl,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export interface UniversalKeyValidationResult {
	valid: boolean;
	provider: string;
	model: string;
	keyMask: string;
	latencyMs: number;
	baseUrl: string;
	error?: string | undefined;
}

/**
 * Universal live health-check probe for BYOK API keys (Gemini, OpenAI, DeepSeek, Custom).
 */
export async function validateUniversalApiKeyLive(
	provider: string,
	apiKey: string,
	targetModel?: string,
	customBaseUrl?: string,
	fetchFn: typeof fetch = globalThis.fetch,
): Promise<UniversalKeyValidationResult> {
	const prov = (provider || "gemini").toLowerCase();
	const keyMask = maskApiKey(apiKey);
	const start = Date.now();

	if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
		return {
			valid: false,
			provider: prov,
			model: targetModel || "default",
			keyMask: "...none",
			latencyMs: 0,
			baseUrl: customBaseUrl || "",
			error: "API-ключ не заполнен",
		};
	}

	if (prov === "gemini") {
		const res = await validateGeminiApiKeyLive(apiKey, fetchFn, targetModel || DEFAULT_GEMINI_MODEL);
		return {
			valid: res.valid,
			provider: "gemini",
			model: res.model,
			keyMask: res.keyMask,
			latencyMs: res.latencyMs,
			baseUrl: res.baseUrl,
			error: res.error,
		};
	}

	const baseUrl = (customBaseUrl || (prov === "deepseek" ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1")).replace(/\/+$/, "");
	const model = targetModel || (prov === "deepseek" ? "deepseek-chat" : "gpt-4o-mini");

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);

		const response = await fetchFn(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey.trim()}`,
			},
			body: JSON.stringify({
				model,
				messages: [{ role: "user", content: "ping" }],
				max_tokens: 1,
			}),
			signal: controller.signal,
		});

		clearTimeout(timeout);
		const latencyMs = Date.now() - start;

		if (response.ok) {
			return {
				valid: true,
				provider: prov,
				model,
				keyMask,
				latencyMs,
				baseUrl,
			};
		}

		const errBody = await response.text().catch(() => "");
		return {
			valid: false,
			provider: prov,
			model,
			keyMask,
			latencyMs,
			baseUrl,
			error: `HTTP ${response.status}: ${errBody.slice(0, 150)}`,
		};
	} catch (err) {
		return {
			valid: false,
			provider: prov,
			model,
			keyMask,
			latencyMs: Date.now() - start,
			baseUrl,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

/**
 * Resolves effective API keys based on the targeted model (e.g. Gemini vs AgentRouter).
 */
export function resolveEffectiveKeys(
	targetModel: string,
	configuredKeys: readonly string[],
): string[] {
	if (isGeminiModel(targetModel)) {
		const geminiKeys = getGeminiApiKeyCandidates();
		if (geminiKeys.length > 0) return geminiKeys;
	}
	return [...configuredKeys];
}

export interface ResolvedEndpoint {
	url: string;
	isGemini: boolean;
	headers: Record<string, string>;
}

/**
 * Builds endpoint URL and HTTP headers tailored for the target model provider.
 */
export function resolveRequestEndpoint(
	targetModel: string,
	defaultBaseUrl: string,
	key: string,
	stream: boolean,
): ResolvedEndpoint {
	const isGemini = isGeminiModel(targetModel);
	const baseUrl = isGemini ? getGeminiBaseUrl() : defaultBaseUrl;
	const accept = stream ? "text/event-stream" : "application/json";
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${key}`,
		Accept: accept,
		"User-Agent": "opencode/1.18.25",
	};

	if (isGemini) {
		headers["x-goog-api-key"] = key;
	}

	return {
		url: `${baseUrl}/chat/completions`,
		isGemini,
		headers,
	};
}

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
