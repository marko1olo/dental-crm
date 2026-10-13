/**
 * AgentRouter (DeepSeek) Resilient Industrial Network Client
 *
 * Implements high-availability OpenAI-compatible Chat Completions & Streaming client
 * with multi-key round-robin rotation, 429/5xx cooldown isolation, 402 model budget quota
 * overload detection (preserving API keys), strict key scrubbing, and robust tool-call parsing.
 */

export const DEFAULT_AGENTROUTER_BASE_URL = "https://agentrouter.org/v1";
export const DEFAULT_AGENTROUTER_MODEL = "deepseek-v4-flash";
export const DEFAULT_AGENTROUTER_KEYS: readonly string[] = Object.freeze([
	"sk-6osQfoRXkSyFDuySQOAotuSU74uh75f4gGj69e2zqaVytT3u",
	"sk-LhzyJtJxTfDf7enG1bbfrCmK1Aq73Sh9B188hwJNCXm2cENL",
]);

export const DEFAULT_TIMEOUT_MS = 120_000; // 120 seconds for deep reasoning models
export const MIN_REASONING_MAX_TOKENS = 4096;
export const DEFAULT_CLINICAL_TEMPERATURE = 0.2;

// Cooldown intervals
export const RATE_LIMIT_COOLDOWN_MS = 60_000; // 60s for 429
export const SERVER_ERROR_COOLDOWN_MS = 60_000; // 60s for 5xx / timeout
export const AUTH_ERROR_COOLDOWN_MS = 3_600_000; // 1 hour for 401/403 invalid key
export const MODEL_OVERLOAD_COOLDOWN_MS = 1_800_000; // 30 minutes (1800s) for 402 budget pool

export type AgentRouterRole = "system" | "user" | "assistant" | "tool";

export interface AgentRouterToolCallFunction {
	name: string;
	arguments: string; // JSON string payload per OpenAI spec
}

export interface AgentRouterToolCall {
	id: string;
	type: "function";
	function: AgentRouterToolCallFunction;
}

export interface AgentRouterChatMessage {
	role: AgentRouterRole;
	content?: string | null;
	name?: string;
	tool_call_id?: string;
	tool_calls?: AgentRouterToolCall[];
	reasoning_content?: string | null;
}

export interface AgentRouterToolDefinition {
	type: "function";
	function: {
		name: string;
		description?: string;
		parameters?: Record<string, unknown>;
		strict?: boolean;
	};
}

export type AgentRouterToolChoice =
	| "auto"
	| "none"
	| "required"
	| { type: "function"; function: { name: string } };

export interface AgentRouterChatParams {
	messages: AgentRouterChatMessage[];
	model?: string;
	tools?: AgentRouterToolDefinition[];
	tool_choice?: AgentRouterToolChoice;
	temperature?: number; // default 0.2
	max_tokens?: number; // default >= 4096
	top_p?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	stop?: string | string[];
	response_format?: { type: "text" | "json_object" };
	timeoutMs?: number; // default 120s
	signal?: AbortSignal;
}

export interface AgentRouterChoice {
	index: number;
	message: {
		role: "assistant";
		content: string | null;
		tool_calls?: AgentRouterToolCall[];
		reasoning_content?: string | null;
	};
	finish_reason: string | null;
}

export interface AgentRouterUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	prompt_tokens_details?: {
		cached_tokens?: number;
	};
	completion_tokens_details?: {
		reasoning_tokens?: number;
	};
}

export interface AgentRouterChatResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: AgentRouterChoice[];
	usage?: AgentRouterUsage;
	system_fingerprint?: string | null;
}

export interface AgentRouterToolCallDelta {
	index: number;
	id?: string;
	type?: "function";
	function?: {
		name?: string;
		arguments?: string;
	};
}

export interface AgentRouterStreamCallbacks {
	onChunk?: (contentChunk: string) => void;
	onReasoningChunk?: (reasoningChunk: string) => void;
	onToolCallDelta?: (delta: AgentRouterToolCallDelta) => void;
	onComplete?: (fullResponse: AgentRouterChatResponse) => void;
	onError?: (error: Error) => void;
}

export interface AgentRouterClientConfig {
	baseUrl?: string;
	defaultModel?: string;
	apiKeys?: string[];
	fetchFn?: typeof fetch;
}

export interface KeyHealthInfo {
	keyMask: string;
	cooldownUntil: number;
	isAvailable: boolean;
	failures: number;
}

export interface ModelHealthInfo {
	model: string;
	bannedUntil: number;
	isBanned: boolean;
}

/**
 * Mask raw API key to prevent secret leakage in logs or stacktraces.
 * Example: "agentrouter...T3u"
 */
export function maskApiKey(key: string | null | undefined): string {
	if (!key || typeof key !== "string") return "agentrouter...none";
	const trimmed = key.trim();
	if (trimmed.length <= 5) return "agentrouter...*****";
	return `agentrouter...${trimmed.slice(-5)}`;
}

/**
 * Parse comma-separated list of API keys with safe trimming, filtering, and fallback.
 */
export function parseApiKeys(envValue?: string | null): string[] {
	if (!envValue || typeof envValue !== "string") {
		return [...DEFAULT_AGENTROUTER_KEYS];
	}
	const parsed = envValue
		.split(",")
		.map((k) => k.trim())
		.filter((k) => k.length > 0);
	return parsed.length > 0 ? parsed : [...DEFAULT_AGENTROUTER_KEYS];
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
 * Error raised when a model's budget pool quota is exhausted (HTTP 402).
 * Note: the API key itself is NOT banned; only the specific model enters cooldown.
 */
export class AgentRouterModelOverloadedError extends Error {
	readonly status = 402;
	readonly model: string;
	readonly cooldownSeconds: number;

	constructor(model: string, cooldownSeconds: number, rawMessage?: string) {
		super(
			`AgentRouter model '${model}' budget pool quota exhausted (HTTP 402). Model banned for ${cooldownSeconds}s. Raw: ${rawMessage ?? "Budget pool quota has been exhausted"}`,
		);
		this.name = "AgentRouterModelOverloadedError";
		this.model = model;
		this.cooldownSeconds = cooldownSeconds;
	}
}

/**
 * Error raised when all API keys in the pool are on cooldown or exhausted.
 */
export class AgentRouterAllKeysExhaustedError extends Error {
	readonly status = 429;
	readonly availableInMs: number;

	constructor(availableInMs: number) {
		super(
			`All AgentRouter API keys are currently cooling down. Next available in ${Math.ceil(availableInMs / 1000)}s.`,
		);
		this.name = "AgentRouterAllKeysExhaustedError";
		this.availableInMs = availableInMs;
	}
}

/**
 * High-reliability AgentRouter client
 */
export class AgentRouterClient {
	private readonly baseUrl: string;
	private readonly defaultModel: string;
	private readonly apiKeys: string[];
	private readonly fetchFn: typeof fetch;

	// Health and cooldown memory stores
	private readonly keyCooldowns = new Map<string, number>();
	private readonly keyFailures = new Map<string, number>();
	private readonly modelBans = new Map<string, number>();
	private roundRobinIndex = 0;

	constructor(config?: AgentRouterClientConfig) {
		this.baseUrl = (
			config?.baseUrl ||
			process.env.AGENTROUTER_BASE_URL ||
			DEFAULT_AGENTROUTER_BASE_URL
		).replace(/\/+$/, "");

		this.defaultModel =
			config?.defaultModel ||
			process.env.AGENTROUTER_MODEL ||
			DEFAULT_AGENTROUTER_MODEL;

		this.apiKeys =
			config?.apiKeys && config.apiKeys.length > 0
				? [...config.apiKeys]
				: parseApiKeys(process.env.AGENTROUTER_API_KEYS);

		this.fetchFn = config?.fetchFn || globalThis.fetch;
	}

	/**
	 * Get current list of configured API keys (unmasked, for internal rotation only).
	 */
	getKeys(): readonly string[] {
		return this.apiKeys;
	}

	/**
	 * Reset all key cooldowns and model bans (useful for testing or manual recovery).
	 */
	clearCooldowns(): void {
		this.keyCooldowns.clear();
		this.keyFailures.clear();
		this.modelBans.clear();
		this.roundRobinIndex = 0;
	}

	/**
	 * Check if a model is currently banned due to HTTP 402 budget exhaustion.
	 */
	isModelBanned(model: string): boolean {
		const bannedUntil = this.modelBans.get(model) || 0;
		return Date.now() < bannedUntil;
	}

	/**
	 * Ban a specific model for a given duration (in seconds).
	 */
	banModel(model: string, durationSeconds: number): void {
		const until = Date.now() + durationSeconds * 1000;
		this.modelBans.set(model, until);
	}

	/**
	 * Retrieve snapshot of key health for telemetry/diagnostics.
	 */
	getKeyHealthSnapshot(): KeyHealthInfo[] {
		const now = Date.now();
		return this.apiKeys.map((key) => {
			const cd = this.keyCooldowns.get(key) || 0;
			return {
				keyMask: maskApiKey(key),
				cooldownUntil: cd,
				isAvailable: now >= cd,
				failures: this.keyFailures.get(key) || 0,
			};
		});
	}

	/**
	 * Retrieve snapshot of model bans for telemetry/diagnostics.
	 */
	getModelHealthSnapshot(): ModelHealthInfo[] {
		const now = Date.now();
		return Array.from(this.modelBans.entries()).map(([model, bannedUntil]) => ({
			model,
			bannedUntil,
			isBanned: now < bannedUntil,
		}));
	}

	/**
	 * Select next available key in round-robin fashion from healthy keys.
	 */
	private selectNextKey(): { key: string; isFallback: boolean } {
		const now = Date.now();
		const total = this.apiKeys.length;
		if (total === 0) {
			throw new Error("AgentRouter key pool is empty. No API keys configured.");
		}

		// Try to find available key starting from roundRobinIndex
		for (let i = 0; i < total; i++) {
			const idx = (this.roundRobinIndex + i) % total;
			const candidate = this.apiKeys[idx];
			const cd = this.keyCooldowns.get(candidate) || 0;
			if (now >= cd) {
				this.roundRobinIndex = (idx + 1) % total;
				return { key: candidate, isFallback: false };
			}
		}

		// All keys are on cooldown. Find key with nearest cooldown expiry.
		let nearestKey = this.apiKeys[0];
		let minCd = this.keyCooldowns.get(nearestKey) || Infinity;
		for (const k of this.apiKeys) {
			const cd = this.keyCooldowns.get(k) || 0;
			if (cd < minCd) {
				minCd = cd;
				nearestKey = k;
			}
		}

		const waitMs = Math.max(0, minCd - now);
		// Return nearest key if within 3 seconds, otherwise throw explicit error
		if (waitMs <= 3000) {
			return { key: nearestKey, isFallback: true };
		}

		throw new AgentRouterAllKeysExhaustedError(waitMs);
	}

	/**
	 * Record failure for a key and set appropriate cooldown.
	 */
	private noteKeyFailure(key: string, cooldownMs: number, reason: string): void {
		const now = Date.now();
		const until = now + cooldownMs;
		this.keyCooldowns.set(key, until);
		const fails = (this.keyFailures.get(key) || 0) + 1;
		this.keyFailures.set(key, fails);

		console.warn(
			`[AgentRouter] Key ${maskApiKey(key)} placed on ${Math.ceil(cooldownMs / 1000)}s cooldown. Reason: ${reason} (failure count: ${fails})`,
		);
	}

	/**
	 * Record success for a key, resetting failure count.
	 */
	private noteKeySuccess(key: string): void {
		this.keyFailures.delete(key);
		this.keyCooldowns.delete(key);
	}

	/**
	 * Build HTTP payload conforming to OpenAI Chat Completions standard.
	 */
	private buildPayload(
		params: AgentRouterChatParams,
		stream: boolean,
	): Record<string, unknown> {
		const targetModel = params.model || this.defaultModel;

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
		if (params.response_format)
			payload.response_format = params.response_format;

		if (params.tools && params.tools.length > 0) {
			payload.tools = params.tools;
			payload.tool_choice = params.tool_choice ?? "auto";
		}

		return payload;
	}

	/**
	 * Create non-streaming Chat Completion with automatic multi-key rotation and 402/429 resilience.
	 */
	async createChatCompletion(
		params: AgentRouterChatParams,
	): Promise<AgentRouterChatResponse> {
		const targetModel = params.model || this.defaultModel;

		if (this.isModelBanned(targetModel)) {
			const bannedUntil = this.modelBans.get(targetModel) || 0;
			const remainingSec = Math.max(
				1,
				Math.ceil((bannedUntil - Date.now()) / 1000),
			);
			throw new AgentRouterModelOverloadedError(
				targetModel,
				remainingSec,
				`Model is currently in 402 budget cooldown (${remainingSec}s remaining)`,
			);
		}

		const attemptsLimit = Math.max(1, this.apiKeys.length);
		const errors: string[] = [];
		const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

		for (let attempt = 0; attempt < attemptsLimit; attempt++) {
			let key: string;
			try {
				const selected = this.selectNextKey();
				key = selected.key;
			} catch (err) {
				if (err instanceof AgentRouterAllKeysExhaustedError) {
					throw err;
				}
				throw new Error(
					`Failed to select AgentRouter API key: ${(err as Error).message}`,
				);
			}

			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);

			let linkedSignal: AbortSignal = controller.signal;
			if (params.signal) {
				if (typeof AbortSignal.any === "function") {
					linkedSignal = AbortSignal.any([params.signal, controller.signal]);
				} else {
					params.signal.addEventListener("abort", () => controller.abort(), {
						once: true,
					});
				}
			}

			try {
				const body = JSON.stringify(this.buildPayload(params, false));
				const response = await this.fetchFn(
					`${this.baseUrl}/chat/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${key}`,
							Accept: "application/json",
						},
						body,
						signal: linkedSignal,
					},
				);

				clearTimeout(timer);

				if (response.ok) {
					const data = (await response.json()) as AgentRouterChatResponse;
					this.noteKeySuccess(key);
					return data;
				}

				// Error handling:
				const status = response.status;
				const errorText = await response.text().catch(() => "");
				const lowerErr = errorText.toLowerCase();

				// Critical: 402 Budget pool quota has been exhausted
				// As proven in gemini_client.py:494-504 & test_agentrouter.py:79-88:
				// Error 402 indicates model budget exhaustion. It MUST NOT ban the API key! Key stays alive.
				if (
					status === 402 ||
					lowerErr.includes("budget pool") ||
					lowerErr.includes("quota has been exhausted")
				) {
					const banDurationSec = Math.floor(MODEL_OVERLOAD_COOLDOWN_MS / 1000);
					this.banModel(targetModel, banDurationSec);
					console.warn(
						`[AgentRouter] Model '${targetModel}' budget pool exhausted (402). Model banned for ${banDurationSec}s. Key ${maskApiKey(key)} remains active.`,
					);
					throw new AgentRouterModelOverloadedError(
						targetModel,
						banDurationSec,
						errorText,
					);
				}

				// 429: Rate limit hit for this specific key
				if (status === 429 || lowerErr.includes("rate limit")) {
					this.noteKeyFailure(key, RATE_LIMIT_COOLDOWN_MS, `HTTP 429`);
					errors.push(
						`Key ${maskApiKey(key)}: 429 Rate Limit (${errorText.slice(0, 100)})`,
					);
					continue; // Rotate to next key
				}

				// 401 / 403: Invalid or revoked API key
				if (status === 401 || status === 403) {
					this.noteKeyFailure(
						key,
						AUTH_ERROR_COOLDOWN_MS,
						`HTTP ${status} Auth Error`,
					);
					errors.push(`Key ${maskApiKey(key)}: HTTP ${status} Auth Error`);
					continue; // Rotate to next key
				}

				// 5xx: Server error at AgentRouter upstream
				if (status >= 500) {
					this.noteKeyFailure(
						key,
						SERVER_ERROR_COOLDOWN_MS,
						`HTTP ${status} Server Error`,
					);
					errors.push(
						`Key ${maskApiKey(key)}: HTTP ${status} (${errorText.slice(0, 100)})`,
					);
					continue; // Rotate to next key
				}

				// Other 4xx error (e.g. 400 Bad Request) - don't rotate key, throw immediately
				throw new Error(
					`AgentRouter HTTP ${status} error with key ${maskApiKey(key)}: ${errorText.slice(0, 300)}`,
				);
			} catch (err: unknown) {
				clearTimeout(timer);
				if (err instanceof AgentRouterModelOverloadedError) {
					throw err; // Model budget exhausted, pass through
				}

				const isAbort =
					(err as { name?: string })?.name === "AbortError" ||
					(err as { message?: string })?.message?.includes("aborted");

				if (isAbort && params.signal?.aborted) {
					throw err; // User requested abort
				}

				if (isAbort) {
					// Timeout occurred
					this.noteKeyFailure(
						key,
						SERVER_ERROR_COOLDOWN_MS,
						`Timeout after ${timeoutMs}ms`,
					);
					errors.push(
						`Key ${maskApiKey(key)}: Request timed out (${timeoutMs}ms)`,
					);
					continue;
				}

				// Network / fetch error
				const msg = (err as Error)?.message || String(err);
				this.noteKeyFailure(key, SERVER_ERROR_COOLDOWN_MS, `Network error: ${msg}`);
				errors.push(`Key ${maskApiKey(key)}: Network error: ${msg}`);
			}
		}

		throw new Error(
			`AgentRouter exhausted all keys (${attemptsLimit} attempts failed). Errors: [${errors.join("; ")}]`,
		);
	}

	/**
	 * Create Streaming Chat Completion with Server-Sent Events (SSE), tool-call chunk aggregation,
	 * reasoning chunk streaming, and multi-key rotation fallback.
	 */
	async createStreamingChatCompletion(
		params: AgentRouterChatParams,
		callbacks: AgentRouterStreamCallbacks = {},
	): Promise<AgentRouterChatResponse> {
		const targetModel = params.model || this.defaultModel;

		if (this.isModelBanned(targetModel)) {
			const bannedUntil = this.modelBans.get(targetModel) || 0;
			const remainingSec = Math.max(
				1,
				Math.ceil((bannedUntil - Date.now()) / 1000),
			);
			const err = new AgentRouterModelOverloadedError(
				targetModel,
				remainingSec,
				`Model is currently in 402 budget cooldown (${remainingSec}s remaining)`,
			);
			callbacks.onError?.(err);
			throw err;
		}

		const attemptsLimit = Math.max(1, this.apiKeys.length);
		const errors: string[] = [];
		const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

		for (let attempt = 0; attempt < attemptsLimit; attempt++) {
			let key: string;
			try {
				const selected = this.selectNextKey();
				key = selected.key;
			} catch (err) {
				if (err instanceof AgentRouterAllKeysExhaustedError) {
					callbacks.onError?.(err);
					throw err;
				}
				const selectErr = new Error(
					`Failed to select AgentRouter API key: ${(err as Error).message}`,
				);
				callbacks.onError?.(selectErr);
				throw selectErr;
			}

			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);

			let linkedSignal: AbortSignal = controller.signal;
			if (params.signal) {
				if (typeof AbortSignal.any === "function") {
					linkedSignal = AbortSignal.any([params.signal, controller.signal]);
				} else {
					params.signal.addEventListener("abort", () => controller.abort(), {
						once: true,
					});
				}
			}

			try {
				const body = JSON.stringify(this.buildPayload(params, true));
				const response = await this.fetchFn(
					`${this.baseUrl}/chat/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${key}`,
							Accept: "text/event-stream",
						},
						body,
						signal: linkedSignal,
					},
				);

				clearTimeout(timer);

				if (!response.ok) {
					const status = response.status;
					const errorText = await response.text().catch(() => "");
					const lowerErr = errorText.toLowerCase();

					if (
						status === 402 ||
						lowerErr.includes("budget pool") ||
						lowerErr.includes("quota has been exhausted")
					) {
						const banDurationSec = Math.floor(
							MODEL_OVERLOAD_COOLDOWN_MS / 1000,
						);
						this.banModel(targetModel, banDurationSec);
						console.warn(
							`[AgentRouter] Model '${targetModel}' budget pool exhausted (402). Model banned for ${banDurationSec}s. Key ${maskApiKey(key)} remains active.`,
						);
						const overloadErr = new AgentRouterModelOverloadedError(
							targetModel,
							banDurationSec,
							errorText,
						);
						callbacks.onError?.(overloadErr);
						throw overloadErr;
					}

					if (status === 429 || lowerErr.includes("rate limit")) {
						this.noteKeyFailure(key, RATE_LIMIT_COOLDOWN_MS, `HTTP 429`);
						errors.push(
							`Key ${maskApiKey(key)}: 429 Rate Limit (${errorText.slice(0, 100)})`,
						);
						continue;
					}

					if (status === 401 || status === 403) {
						this.noteKeyFailure(
							key,
							AUTH_ERROR_COOLDOWN_MS,
							`HTTP ${status} Auth Error`,
						);
						errors.push(`Key ${maskApiKey(key)}: HTTP ${status} Auth Error`);
						continue;
					}

					if (status >= 500) {
						this.noteKeyFailure(
							key,
							SERVER_ERROR_COOLDOWN_MS,
							`HTTP ${status} Server Error`,
						);
						errors.push(
							`Key ${maskApiKey(key)}: HTTP ${status} (${errorText.slice(0, 100)})`,
						);
						continue;
					}

					throw new Error(
						`AgentRouter streaming HTTP ${status} error with key ${maskApiKey(key)}: ${errorText.slice(0, 300)}`,
					);
				}

				if (!response.body) {
					throw new Error("AgentRouter streaming response has no body");
				}

				// Stream processing
				const fullResponse = await this.readSseStream(
					response.body,
					targetModel,
					callbacks,
				);
				this.noteKeySuccess(key);
				callbacks.onComplete?.(fullResponse);
				return fullResponse;
			} catch (err: unknown) {
				clearTimeout(timer);
				if (err instanceof AgentRouterModelOverloadedError) {
					throw err;
				}

				const isAbort =
					(err as { name?: string })?.name === "AbortError" ||
					(err as { message?: string })?.message?.includes("aborted");

				if (isAbort && params.signal?.aborted) {
					throw err;
				}

				if (isAbort) {
					this.noteKeyFailure(
						key,
						SERVER_ERROR_COOLDOWN_MS,
						`Stream timed out after ${timeoutMs}ms`,
					);
					errors.push(
						`Key ${maskApiKey(key)}: Stream timed out (${timeoutMs}ms)`,
					);
					continue;
				}

				const msg = (err as Error)?.message || String(err);
				this.noteKeyFailure(
					key,
					SERVER_ERROR_COOLDOWN_MS,
					`Stream error: ${msg}`,
				);
				errors.push(`Key ${maskApiKey(key)}: Stream error: ${msg}`);
			}
		}

		const aggregatedError = new Error(
			`AgentRouter exhausted all keys for streaming (${attemptsLimit} attempts failed). Errors: [${errors.join("; ")}]`,
		);
		callbacks.onError?.(aggregatedError);
		throw aggregatedError;
	}

	/**
	 * Internal helper to read and accumulate Server-Sent Events stream from response body.
	 */
	private async readSseStream(
		body: ReadableStream<Uint8Array>,
		targetModel: string,
		callbacks: AgentRouterStreamCallbacks,
	): Promise<AgentRouterChatResponse> {
		const reader = body.getReader();
		const decoder = new TextDecoder("utf-8");

		let buffer = "";
		let responseId = `agentrouter-${Date.now()}`;
		let createdTime = Math.floor(Date.now() / 1000);
		let responseModel = targetModel;
		let finishReason: string | null = null;
		let fullContent = "";
		let fullReasoning = "";

		// Tool calls accumulator indexed by tool call index
		const toolCallsMap = new Map<
			number,
			{
				id: string;
				name: string;
				arguments: string;
			}
		>();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const rawLine of lines) {
					const line = rawLine.trim();
					if (!line || line.startsWith(":")) continue; // comment or empty
					if (!line.startsWith("data:")) continue;

					const dataStr = line.slice(5).trim();
					if (dataStr === "[DONE]") {
						break;
					}

					let parsedChunk: any;
					try {
						parsedChunk = JSON.parse(dataStr);
					} catch {
						// Incomplete or malformed JSON in SSE chunk, ignore
						continue;
					}

					if (parsedChunk.id) responseId = parsedChunk.id;
					if (parsedChunk.created) createdTime = parsedChunk.created;
					if (parsedChunk.model) responseModel = parsedChunk.model;

					const choice = parsedChunk.choices?.[0];
					if (!choice) continue;

					if (choice.finish_reason) {
						finishReason = choice.finish_reason;
					}

					const delta = choice.delta;
					if (!delta) continue;

					// 1. Text content delta
					if (delta.content) {
						fullContent += delta.content;
						callbacks.onChunk?.(delta.content);
					}

					// 2. DeepSeek reasoning content delta
					if (delta.reasoning_content) {
						fullReasoning += delta.reasoning_content;
						callbacks.onReasoningChunk?.(delta.reasoning_content);
					}

					// 3. Tool call deltas
					if (Array.isArray(delta.tool_calls)) {
						for (const tcDelta of delta.tool_calls) {
							const idx = tcDelta.index ?? 0;
							let current = toolCallsMap.get(idx);
							if (!current) {
								current = {
									id: tcDelta.id || `call_${idx}_${Date.now()}`,
									name: "",
									arguments: "",
								};
								toolCallsMap.set(idx, current);
							}

							if (tcDelta.id) {
								current.id = tcDelta.id;
							}
							if (tcDelta.function?.name) {
								current.name += tcDelta.function.name;
							}
							if (tcDelta.function?.arguments) {
								current.arguments += tcDelta.function.arguments;
							}

							callbacks.onToolCallDelta?.({
								index: idx,
								id: tcDelta.id,
								type: "function",
								function: tcDelta.function,
							});
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		const aggregatedToolCalls: AgentRouterToolCall[] = Array.from(
			toolCallsMap.entries(),
		)
			.sort(([a], [b]) => a - b)
			.map(([, tc]) => ({
				id: tc.id,
				type: "function" as const,
				function: {
					name: tc.name,
					arguments: tc.arguments,
				},
			}));

		return {
			id: responseId,
			object: "chat.completion",
			created: createdTime,
			model: responseModel,
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content: fullContent.length > 0 ? fullContent : null,
						tool_calls:
							aggregatedToolCalls.length > 0 ? aggregatedToolCalls : undefined,
						reasoning_content:
							fullReasoning.length > 0 ? fullReasoning : undefined,
					},
					finish_reason: finishReason || "stop",
				},
			],
		};
	}
}

/**
 * Global singleton instance with environment configuration
 */
export const agentRouterClient = new AgentRouterClient();

/**
 * Functional facade for standard non-streaming completions
 */
export async function createChatCompletion(
	params: AgentRouterChatParams,
): Promise<AgentRouterChatResponse> {
	return agentRouterClient.createChatCompletion(params);
}

/**
 * Functional facade for streaming completions
 */
export async function createStreamingChatCompletion(
	params: AgentRouterChatParams,
	callbacks: AgentRouterStreamCallbacks = {},
): Promise<AgentRouterChatResponse> {
	return agentRouterClient.createStreamingChatCompletion(params, callbacks);
}
