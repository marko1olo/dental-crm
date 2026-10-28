/**
 * agentRouterCore.ts — Core High-Availability AgentRouter Client Implementation
 */

import {
	DEFAULT_AGENTROUTER_BASE_URL,
	DEFAULT_AGENTROUTER_MODEL,
	DEFAULT_TIMEOUT_MS,
	RATE_LIMIT_COOLDOWN_MS,
	SERVER_ERROR_COOLDOWN_MS,
	AUTH_ERROR_COOLDOWN_MS,
	MODEL_OVERLOAD_COOLDOWN_MS,
	type AgentRouterChatParams,
	type AgentRouterChatResponse,
	type AgentRouterClientConfig,
	type AgentRouterStreamCallbacks,
	type KeyHealthInfo,
	type ModelHealthInfo,
	AgentRouterAllKeysExhaustedError,
	AgentRouterModelOverloadedError,
} from "./routerTypes.js";
import {
	KeyPoolManager,
	maskApiKey,
	parseApiKeys,
} from "./keyPoolManager.js";
import { buildChatPayload } from "./modelAdapters.js";
import { readSseStream } from "./streamParser.js";

export class AgentRouterClient {
	private readonly baseUrl: string;
	private readonly defaultModel: string;
	private readonly fetchFn: typeof fetch;
	private readonly keyPool: KeyPoolManager;

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

		const keys =
			config?.apiKeys && config.apiKeys.length > 0
				? [...config.apiKeys]
				: parseApiKeys(process.env.AGENTROUTER_API_KEYS);

		this.keyPool = new KeyPoolManager(keys);
		this.fetchFn = config?.fetchFn || globalThis.fetch;
	}

	getKeys(): readonly string[] {
		return this.keyPool.getKeys();
	}

	clearCooldowns(): void {
		this.keyPool.clearCooldowns();
	}

	isModelBanned(model: string): boolean {
		return this.keyPool.isModelBanned(model);
	}

	banModel(model: string, durationSeconds: number): void {
		this.keyPool.banModel(model, durationSeconds);
	}

	getKeyHealthSnapshot(): KeyHealthInfo[] {
		return this.keyPool.getKeyHealthSnapshot();
	}

	getModelHealthSnapshot(): ModelHealthInfo[] {
		return this.keyPool.getModelHealthSnapshot();
	}

	async createChatCompletion(
		params: AgentRouterChatParams,
	): Promise<AgentRouterChatResponse> {
		const targetModel = params.model || this.defaultModel;

		if (this.isModelBanned(targetModel)) {
			const bannedUntil = this.keyPool.getModelBanExpiry(targetModel);
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

		const attemptsLimit = Math.max(1, this.keyPool.getKeys().length);
		const errors: string[] = [];
		const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

		for (let attempt = 0; attempt < attemptsLimit; attempt++) {
			let key: string;
			try {
				const selected = this.keyPool.selectNextKey();
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
				const body = JSON.stringify(
					buildChatPayload(params, this.defaultModel, false),
				);
				const response = await this.fetchFn(
					`${this.baseUrl}/chat/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${key}`,
							Accept: "application/json",
							"User-Agent": "opencode/1.18.25",
						},
						body,
						signal: linkedSignal,
					},
				);

				clearTimeout(timer);

				if (response.ok) {
					const data = (await response.json()) as AgentRouterChatResponse;
					this.keyPool.noteKeySuccess(key);
					return data;
				}

				const status = response.status;
				const errorText = await response.text().catch(() => "");
				const lowerErr = errorText.toLowerCase();

				// 402 Budget pool quota exhausted: bans model, keeps API key active
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

				// 429: Rate limit hit
				if (status === 429 || lowerErr.includes("rate limit")) {
					this.keyPool.noteKeyFailure(key, RATE_LIMIT_COOLDOWN_MS, `HTTP 429`);
					errors.push(
						`Key ${maskApiKey(key)}: 429 Rate Limit (${errorText.slice(0, 100)})`,
					);
					continue;
				}

				// 401 / 403: Invalid or revoked API key
				if (status === 401 || status === 403) {
					this.keyPool.noteKeyFailure(
						key,
						AUTH_ERROR_COOLDOWN_MS,
						`HTTP ${status} Auth Error`,
					);
					errors.push(`Key ${maskApiKey(key)}: HTTP ${status} Auth Error`);
					continue;
				}

				// 5xx: Server error
				if (status >= 500) {
					this.keyPool.noteKeyFailure(
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
					`AgentRouter HTTP ${status} error with key ${maskApiKey(key)}: ${errorText.slice(0, 300)}`,
				);
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
					this.keyPool.noteKeyFailure(
						key,
						SERVER_ERROR_COOLDOWN_MS,
						`Timeout after ${timeoutMs}ms`,
					);
					errors.push(
						`Key ${maskApiKey(key)}: Request timed out (${timeoutMs}ms)`,
					);
					continue;
				}

				const msg = (err as Error)?.message || String(err);
				this.keyPool.noteKeyFailure(
					key,
					SERVER_ERROR_COOLDOWN_MS,
					`Network error: ${msg}`,
				);
				errors.push(`Key ${maskApiKey(key)}: Network error: ${msg}`);
			}
		}

		throw new Error(
			`AgentRouter exhausted all keys (${attemptsLimit} attempts failed). Errors: [${errors.join("; ")}]`,
		);
	}

	async createStreamingChatCompletion(
		params: AgentRouterChatParams,
		callbacks: AgentRouterStreamCallbacks = {},
	): Promise<AgentRouterChatResponse> {
		const targetModel = params.model || this.defaultModel;

		if (this.isModelBanned(targetModel)) {
			const bannedUntil = this.keyPool.getModelBanExpiry(targetModel);
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

		const attemptsLimit = Math.max(1, this.keyPool.getKeys().length);
		const errors: string[] = [];
		const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

		for (let attempt = 0; attempt < attemptsLimit; attempt++) {
			let key: string;
			try {
				const selected = this.keyPool.selectNextKey();
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
				const body = JSON.stringify(
					buildChatPayload(params, this.defaultModel, true),
				);
				const response = await this.fetchFn(
					`${this.baseUrl}/chat/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${key}`,
							Accept: "text/event-stream",
							"User-Agent": "opencode/1.18.25",
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
						this.keyPool.noteKeyFailure(key, RATE_LIMIT_COOLDOWN_MS, `HTTP 429`);
						errors.push(
							`Key ${maskApiKey(key)}: 429 Rate Limit (${errorText.slice(0, 100)})`,
						);
						continue;
					}

					if (status === 401 || status === 403) {
						this.keyPool.noteKeyFailure(
							key,
							AUTH_ERROR_COOLDOWN_MS,
							`HTTP ${status} Auth Error`,
						);
						errors.push(`Key ${maskApiKey(key)}: HTTP ${status} Auth Error`);
						continue;
					}

					if (status >= 500) {
						this.keyPool.noteKeyFailure(
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

				const fullResponse = await readSseStream(
					response.body,
					targetModel,
					callbacks,
				);
				this.keyPool.noteKeySuccess(key);
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
					this.keyPool.noteKeyFailure(
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
				this.keyPool.noteKeyFailure(
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
}
