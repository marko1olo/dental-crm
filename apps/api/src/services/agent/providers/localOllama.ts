/**
 * localOllama.ts — On-Premise Local LLM Inference Provider (Ollama / vLLM / LM Studio).
 *
 * Implements the LLMProvider interface for local on-premise inference engines.
 * Supports OpenAI-compatible endpoints, SSE streaming, JSON schema tool calling,
 * open medical/clinical models (Saiga-Llama-3-8B, Qwen-2.5-7B, Mistral-Nemo),
 * and 152-FZ Air-Gap compliance.
 */

import type {
	LLMProvider,
	LLMStreamEvent,
	ProviderMessage,
	TextBlock,
	ToolResultBlock,
	ToolUseBlock,
} from "../types.js";

export const OPEN_MODEL_SAIGA_8B = "saiga_llama3_8b";
export const OPEN_MODEL_QWEN_7B = "qwen2.5:7b";
export const OPEN_MODEL_MISTRAL_NEMO = "mistral-nemo";

export const DEFAULT_LOCAL_INFERENCE_URL = "http://127.0.0.1:11434/v1";
export const DEFAULT_LOCAL_MODEL = OPEN_MODEL_SAIGA_8B;
export const DEFAULT_LOCAL_TIMEOUT_MS = 60_000;

export interface LocalOllamaProviderOptions {
	/**
	 * Base URL for the OpenAI-compatible endpoint (e.g. http://127.0.0.1:11434/v1 or http://localhost:8000/v1)
	 */
	readonly baseUrl?: string | undefined;
	/**
	 * Default local model identifier
	 */
	readonly defaultModel?: string | undefined;
	/**
	 * Request timeout in milliseconds (default: 60,000 ms)
	 */
	readonly timeoutMs?: number | undefined;
	/**
	 * Optional API key or bearer token (for LM Studio / vLLM / authenticated gateways)
	 */
	readonly apiKey?: string | undefined;
	/**
	 * Enforce strict 152-FZ Air-Gap compliance (blocks non-local network egress)
	 */
	readonly airGapMode?: boolean | undefined;
	/**
	 * Allowed hostnames/IPs when airGapMode is enabled
	 */
	readonly allowedHosts?: string[] | undefined;
	/**
	 * Custom HTTP headers
	 */
	readonly customHeaders?: Record<string, string> | undefined;
	/**
	 * Ollama keep_alive duration (e.g. "24h" to avoid GPU model unloading)
	 */
	readonly keepAlive?: string | number | undefined;
	/**
	 * Custom fetch implementation (useful for unit tests or mocked gateways)
	 */
	readonly fetchFn?: typeof fetch | undefined;
}

export class LocalInferenceError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode?: number,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "LocalInferenceError";
	}
}

export class LocalInferenceConnectionError extends LocalInferenceError {
	constructor(message: string, details?: unknown) {
		super(message, "LOCAL_INFERENCE_CONNECTION_REFUSED", undefined, details);
		this.name = "LocalInferenceConnectionError";
	}
}

export class LocalInferenceTimeoutError extends LocalInferenceError {
	constructor(message: string, timeoutMs: number) {
		super(message, "LOCAL_INFERENCE_TIMEOUT", 408, { timeoutMs });
		this.name = "LocalInferenceTimeoutError";
	}
}

export class AirGapViolationError extends LocalInferenceError {
	constructor(targetUrl: string, reason: string) {
		super(
			`152-FZ Air-Gap Security Violation: External network egress blocked for target '${targetUrl}'. Reason: ${reason}`,
			"AIR_GAP_EGRESS_BLOCKED",
			403,
			{ targetUrl, reason },
		);
		this.name = "AirGapViolationError";
	}
}

/**
 * Checks if a given URL is strictly local / private (RFC 1918 / localhost / clinic on-prem).
 */
export function isAirGapCompliantUrl(
	rawUrl: string,
	allowedHosts: string[] = [],
): { compliant: boolean; reason?: string } {
	try {
		const parsed = new URL(rawUrl);
		const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

		// 1. Loopback addresses
		if (
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "::1" ||
			hostname === "0.0.0.0"
		) {
			return { compliant: true };
		}

		// 2. Explicitly allowed custom on-prem hostnames
		for (const allowed of allowedHosts) {
			if (
				hostname === allowed.toLowerCase() ||
				hostname.endsWith(`.${allowed.toLowerCase()}`)
			) {
				return { compliant: true };
			}
		}

		// 3. Common internal private TLDs (RFC 6762 / RFC 8375 / internal)
		if (
			hostname.endsWith(".local") ||
			hostname.endsWith(".lan") ||
			hostname.endsWith(".internal") ||
			hostname.endsWith(".home.arpa")
		) {
			return { compliant: true };
		}

		// 4. Private IPv4 ranges (RFC 1918) and link-local (RFC 3927)
		const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
		if (ipv4Match) {
			const octet1 = Number(ipv4Match[1]);
			const octet2 = Number(ipv4Match[2]);
			const octet3 = Number(ipv4Match[3]);
			const octet4 = Number(ipv4Match[4]);

			if (
				octet1 > 255 ||
				octet2 > 255 ||
				octet3 > 255 ||
				octet4 > 255
			) {
				return { compliant: false, reason: "Invalid IPv4 address format" };
			}

			// 10.0.0.0/8
			if (octet1 === 10) return { compliant: true };
			// 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
			if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return { compliant: true };
			// 192.168.0.0/16
			if (octet1 === 192 && octet2 === 168) return { compliant: true };
			// 169.254.0.0/16 (Link-Local)
			if (octet1 === 169 && octet2 === 254) return { compliant: true };

			return {
				compliant: false,
				reason: `Public IPv4 address ${hostname} is forbidden in 152-FZ Air-Gap mode`,
			};
		}

		return {
			compliant: false,
			reason: `External domain '${hostname}' is prohibited in 152-FZ Air-Gap on-prem mode`,
		};
	} catch (error) {
		return {
			compliant: false,
			reason: `Malformed URL: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

/**
 * Normalizes OpenAI-compatible base URL ensuring standard path structure.
 */
export function normalizeOpenAiBaseUrl(baseUrl: string): string {
	let clean = baseUrl.trim().replace(/\/+$/, "");
	if (!clean.endsWith("/v1")) {
		// If base URL is standard host:port (e.g. http://127.0.0.1:11434), append /v1
		if (!clean.includes("/api") && !clean.includes("/v1")) {
			clean = `${clean}/v1`;
		}
	}
	return clean;
}

/**
 * Formats ProviderMessages into OpenAI Chat Completion message objects.
 */
export function formatMessagesForOpenAi(
	system: string,
	messages: ProviderMessage[],
): Array<Record<string, unknown>> {
	const formatted: Array<Record<string, unknown>> = [];

	if (system && system.trim().length > 0) {
		formatted.push({ role: "system", content: system.trim() });
	}

	for (const msg of messages) {
		if (typeof msg.content === "string") {
			formatted.push({ role: msg.role, content: msg.content });
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
					formatted.push({
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

				formatted.push({
					role: msg.role,
					content: textContent || null,
					...(toolCalls ? { tool_calls: toolCalls } : {}),
				});
			}
		}
	}

	return formatted;
}

/**
 * LocalOllamaProvider implements LLMProvider targeting local Ollama / vLLM / LM Studio instances.
 */
export class LocalOllamaProvider implements LLMProvider {
	public readonly baseUrl: string;
	public readonly defaultModel: string;
	public readonly timeoutMs: number;
	public readonly apiKey: string;
	public readonly airGapMode: boolean;
	public readonly allowedHosts: string[];
	public readonly customHeaders: Record<string, string>;
	public readonly keepAlive: string | number | undefined;
	private readonly fetchFn: typeof fetch;

	constructor(options: LocalOllamaProviderOptions = {}) {
		const rawUrl =
			options.baseUrl ||
			process.env.OLLAMA_BASE_URL ||
			process.env.LOCAL_LLM_BASE_URL ||
			DEFAULT_LOCAL_INFERENCE_URL;

		this.baseUrl = normalizeOpenAiBaseUrl(rawUrl);
		this.defaultModel =
			options.defaultModel ||
			process.env.OLLAMA_MODEL ||
			process.env.LOCAL_LLM_MODEL ||
			DEFAULT_LOCAL_MODEL;
		this.timeoutMs = options.timeoutMs ?? DEFAULT_LOCAL_TIMEOUT_MS;
		this.apiKey = options.apiKey || process.env.OLLAMA_API_KEY || "ollama";
		this.airGapMode =
			options.airGapMode ??
			(process.env.AIR_GAP_MODE === "true" || process.env.LOCAL_INFERENCE_AIR_GAP === "true");
		this.allowedHosts = options.allowedHosts ?? [];
		this.customHeaders = options.customHeaders ?? {};
		this.keepAlive = options.keepAlive ?? process.env.OLLAMA_KEEP_ALIVE ?? "24h";
		this.fetchFn = options.fetchFn ?? globalThis.fetch;

		if (this.airGapMode) {
			const check = isAirGapCompliantUrl(this.baseUrl, this.allowedHosts);
			if (!check.compliant) {
				throw new AirGapViolationError(this.baseUrl, check.reason ?? "Forbidden remote host");
			}
		}
	}

	public async *complete(params: {
		system: string;
		messages: ProviderMessage[];
		tools?: Record<string, unknown>[];
		model?: string;
		maxTokens?: number;
		temperature?: number;
	}): AsyncIterable<LLMStreamEvent> {
		if (this.airGapMode) {
			const check = isAirGapCompliantUrl(this.baseUrl, this.allowedHosts);
			if (!check.compliant) {
				throw new AirGapViolationError(
					this.baseUrl,
					check.reason ?? "Target endpoint violated 152-FZ Air-Gap perimeter",
				);
			}
		}

		const model = params.model || this.defaultModel;
		const endpoint = `${this.baseUrl}/chat/completions`;
		const formattedMessages = formatMessagesForOpenAi(
			params.system,
			params.messages,
		);

		const requestPayload: Record<string, unknown> = {
			model,
			messages: formattedMessages,
			stream: true,
			temperature: params.temperature ?? 0.15,
			max_tokens: params.maxTokens ?? 4096,
		};

		if (params.tools && params.tools.length > 0) {
			requestPayload.tools = params.tools;
			requestPayload.tool_choice = "auto";
		}

		if (this.keepAlive !== undefined) {
			requestPayload.keep_alive = this.keepAlive;
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.apiKey}`,
			...this.customHeaders,
		};

		const controller = new AbortController();
		const timeoutHandle = setTimeout(() => {
			controller.abort();
		}, this.timeoutMs);

		let response: Response;
		try {
			response = await this.fetchFn(endpoint, {
				method: "POST",
				headers,
				body: JSON.stringify(requestPayload),
				signal: controller.signal,
			});
		} catch (err: unknown) {
			clearTimeout(timeoutHandle);
			if (err instanceof Error && err.name === "AbortError") {
				throw new LocalInferenceTimeoutError(
					`Local inference server at ${this.baseUrl} timed out after ${this.timeoutMs}ms`,
					this.timeoutMs,
				);
			}

			const errMsg = err instanceof Error ? err.message : String(err);
			throw new LocalInferenceConnectionError(
				`Failed to connect to local inference engine at ${endpoint}: ${errMsg}. Ensure Ollama / vLLM is running locally (e.g. 'ollama serve').`,
				err,
			);
		} finally {
			clearTimeout(timeoutHandle);
		}

		if (!response.ok) {
			let errorBody = "";
			try {
				errorBody = await response.text();
			} catch {}

			throw new LocalInferenceError(
				`Local inference engine error (HTTP ${response.status}): ${errorBody || response.statusText}`,
				`HTTP_${response.status}`,
				response.status,
				errorBody,
			);
		}

		if (!response.body) {
			throw new LocalInferenceError(
				"Local inference response body is empty or not streamable",
				"EMPTY_RESPONSE_BODY",
			);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8");
		let buffer = "";

		const pendingToolCalls = new Map<
			number,
			{ id: string; name: string; args: string }
		>();

		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				let newlineIndex: number;

				while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
					const rawLine = buffer.slice(0, newlineIndex);
					buffer = buffer.slice(newlineIndex + 1);

					const line = rawLine.trim();
					if (!line || !line.startsWith("data:")) continue;

					const dataStr = line.slice(5).trim();
					if (dataStr === "[DONE]") {
						for (const tc of pendingToolCalls.values()) {
							let parsedArgs: Record<string, unknown> = {};
							try {
								parsedArgs = JSON.parse(tc.args || "{}");
							} catch {
								parsedArgs = { raw: tc.args };
							}
							yield {
								type: "tool_use",
								id: tc.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
								name: tc.name,
								input: parsedArgs,
							};
						}
						pendingToolCalls.clear();
						yield { type: "done", stopReason: "stop" };
						return;
					}

					try {
						const json = JSON.parse(dataStr);

						if (json.usage) {
							yield {
								type: "usage",
								inputTokens: json.usage.prompt_tokens ?? json.usage.input_tokens ?? 0,
								outputTokens:
									json.usage.completion_tokens ?? json.usage.output_tokens ?? 0,
							};
						}

						const choice = json.choices?.[0];
						if (!choice) continue;

						const delta = choice.delta;
						if (delta?.content) {
							yield { type: "text_delta", text: delta.content };
						}

						if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
							for (const tc of delta.tool_calls) {
								const index = tc.index ?? 0;
								const existing = pendingToolCalls.get(index) ?? {
									id: tc.id ?? "",
									name: tc.function?.name ?? "",
									args: "",
								};
								if (tc.id) existing.id = tc.id;
								if (tc.function?.name) existing.name = tc.function.name;
								if (tc.function?.arguments) {
									existing.args += tc.function.arguments;
								}
								pendingToolCalls.set(index, existing);
							}
						}

						if (choice.finish_reason) {
							for (const tc of pendingToolCalls.values()) {
								let parsedArgs: Record<string, unknown> = {};
								try {
									parsedArgs = JSON.parse(tc.args || "{}");
								} catch {
									parsedArgs = { raw: tc.args };
								}
								yield {
									type: "tool_use",
									id: tc.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
									name: tc.name,
									input: parsedArgs,
								};
							}
							pendingToolCalls.clear();

							yield {
								type: "done",
								stopReason: choice.finish_reason,
							};
							return;
						}
					} catch {
						// Ignore partial JSON parse errors in SSE stream line
					}
				}
			}

			// If stream finished without explicit [DONE] or finish_reason
			if (pendingToolCalls.size > 0) {
				for (const tc of pendingToolCalls.values()) {
					let parsedArgs: Record<string, unknown> = {};
					try {
						parsedArgs = JSON.parse(tc.args || "{}");
					} catch {
						parsedArgs = { raw: tc.args };
					}
					yield {
						type: "tool_use",
						id: tc.id || `call_${Date.now()}`,
						name: tc.name,
						input: parsedArgs,
					};
				}
				pendingToolCalls.clear();
			}

			yield { type: "done", stopReason: "stop" };
		} finally {
			try {
				reader.releaseLock();
			} catch {}
		}
	}
}

/**
 * Creates an instance of LocalOllamaProvider.
 */
export function createLocalOllamaProvider(
	options?: LocalOllamaProviderOptions,
): LocalOllamaProvider {
	return new LocalOllamaProvider(options);
}
