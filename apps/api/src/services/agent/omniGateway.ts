/**
 * omniGateway.ts — Omni-LLM Gateway Factory, Circuit Breaker & Multi-Provider Router.
 *
 * Provides resilient unified LLM orchestration with automatic failover (429/500/timeout),
 * streaming tool calling protocols, thinking/reasoning delta forwarding, and tenant AI configuration.
 */

import { z } from "zod";
import type { LLMProvider, LLMStreamEvent, ProviderMessage } from "./types.js";
import { AnthropicProviderAdapter } from "./providers/anthropic.js";
import { DeepSeekProviderAdapter } from "./providers/deepseek.js";
import { GeminiProviderAdapter } from "./providers/gemini.js";
import { GroqProviderAdapter } from "./providers/groq.js";
import { OpenAiProviderAdapter } from "./providers/openai.js";
import { zodToJsonSchema } from "./tools/schemaSerializer.js";
import {
	DEFAULT_CIRCUIT_BREAKER_CONFIG,
	DEFAULT_FALLBACK_CHAIN,
	LlmProviderError,
	OmniGatewayExhaustedError,
	type AgentTool,
	type ChatOptions,
	type CircuitBreakerConfig,
	type ErrorChunk,
	type LlmProviderAdapter,
	type LlmProviderId,
	type LlmStreamChunk,
	type ProviderHealthRecord,
	type UsageChunk,
} from "./omniGatewayTypes.js";

export * from "./omniGatewayTypes.js";

/**
 * Validates tool call arguments against a Zod schema if present on the tool definition.
 */
export function validateToolCallArgs(
	tool:
		| AgentTool
		| { parameters?: z.ZodTypeAny | Record<string, unknown> }
		| Record<string, unknown>,
	rawArgs: unknown,
):
	| { success: true; ok: true; data: any }
	| { success: false; ok: false; error: string; issues?: z.ZodIssue[] } {
	let argsObj = rawArgs;
	if (typeof rawArgs === "string") {
		try {
			argsObj = JSON.parse(rawArgs);
		} catch (err) {
			return {
				success: false,
				ok: false,
				error: `Invalid JSON string in arguments: ${err instanceof Error ? err.message : String(err)}`,
			};
		}
	}

	const params = (tool as any).parameters;
	const toolName = (tool as any).name || "unknown";
	if (params && typeof params.safeParse === "function") {
		const result = (params as z.ZodTypeAny).safeParse(argsObj);
		if (!result.success) {
			const validationMsg = result.error.issues
				.map((i: z.ZodIssue) => `${i.path.join(".")}: ${i.message}`)
				.join("; ");
			return {
				success: false,
				ok: false,
				error: `Invalid arguments for tool '${toolName}': ${validationMsg}`,
				issues: result.error.issues,
			};
		}
		return { success: true, ok: true, data: result.data };
	}

	return { success: true, ok: true, data: argsObj };
}

/**
 * Formats a single LlmStreamChunk into standard SSE wire format.
 */
export function formatSseStreamChunk(chunk: LlmStreamChunk): string {
	const payload = JSON.stringify(chunk);
	return `event: ${chunk.type}\ndata: ${payload}\n\n`;
}

/**
 * Wraps an asynchronous stream of LlmStreamChunks into a web-standard SSE HTTP Response.
 */
export function createSseResponse(
	stream: AsyncIterable<LlmStreamChunk>,
	init: ResponseInit = {},
): Response {
	const encoder = new TextEncoder();
	const readable = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				for await (const chunk of stream) {
					const formatted = formatSseStreamChunk(chunk);
					controller.enqueue(encoder.encode(formatted));
				}
				controller.close();
			} catch (err) {
				const errorChunk: ErrorChunk = {
					type: "error",
					error: err instanceof Error ? err.message : String(err),
				};
				controller.enqueue(encoder.encode(formatSseStreamChunk(errorChunk)));
				controller.close();
			}
		},
	});

	const headers = new Headers(init.headers);
	headers.set("Content-Type", "text/event-stream; charset=utf-8");
	headers.set("Cache-Control", "no-cache, no-transform");
	headers.set("Connection", "keep-alive");

	return new Response(readable, {
		...init,
		headers,
	});
}

/**
 * OmniLlmGateway — Central multi-provider router, health manager, and circuit breaker.
 */
export class OmniLlmGateway {
	private readonly adapters = new Map<LlmProviderId, LlmProviderAdapter>();
	private readonly healthMap = new Map<LlmProviderId, ProviderHealthRecord>();
	private readonly cbConfig: CircuitBreakerConfig;

	constructor(config: Partial<CircuitBreakerConfig> = {}) {
		this.cbConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
		this.registerDefaultAdapters();
	}

	private registerDefaultAdapters(): void {
		this.registerAdapter(new OpenAiProviderAdapter());
		this.registerAdapter(new AnthropicProviderAdapter());
		this.registerAdapter(new GroqProviderAdapter());
		this.registerAdapter(new GeminiProviderAdapter());
		this.registerAdapter(new DeepSeekProviderAdapter());
	}

	public registerAdapter(adapter: LlmProviderAdapter): this {
		this.adapters.set(adapter.providerId, adapter);
		if (!this.healthMap.has(adapter.providerId)) {
			this.healthMap.set(adapter.providerId, {
				state: "closed",
				failures: 0,
				consecutiveFailures: 0,
				successes: 0,
				cooldownUntil: 0,
				lastError: null,
				lastStatusCode: null,
				lastAttemptAt: null,
				lastSuccessAt: null,
			});
		}
		return this;
	}

	public getAdapter(providerId: LlmProviderId): LlmProviderAdapter | undefined {
		return this.adapters.get(providerId);
	}

	public getRegisteredProviders(): LlmProviderId[] {
		return Array.from(this.adapters.keys());
	}

	public getProviderHealth(providerId: LlmProviderId): ProviderHealthRecord {
		let health = this.healthMap.get(providerId);
		if (!health) {
			health = {
				state: "closed",
				failures: 0,
				consecutiveFailures: 0,
				successes: 0,
				cooldownUntil: 0,
				lastError: null,
				lastStatusCode: null,
				lastAttemptAt: null,
				lastSuccessAt: null,
			};
			this.healthMap.set(providerId, health);
		}

		// Re-evaluate open state if cooldown passed
		const now = Date.now();
		if (health.state === "open" && health.cooldownUntil <= now) {
			health.state = "half_open";
		}

		return health;
	}

	public getAllProviderHealth(): Record<LlmProviderId, ProviderHealthRecord> {
		const out: Record<string, ProviderHealthRecord> = {};
		for (const providerId of this.adapters.keys()) {
			out[providerId] = { ...this.getProviderHealth(providerId) };
		}
		return out;
	}

	public recordSuccess(providerId: LlmProviderId): void {
		const health = this.getProviderHealth(providerId);
		health.successes += 1;
		health.consecutiveFailures = 0;
		health.state = "closed";
		health.cooldownUntil = 0;
		health.lastError = null;
		health.lastStatusCode = null;
		health.lastSuccessAt = Date.now();
	}

	public recordFailure(
		providerId: LlmProviderId,
		error: unknown,
		statusCode?: number | null,
	): void {
		const health = this.getProviderHealth(providerId);
		health.failures += 1;
		health.consecutiveFailures += 1;
		health.lastAttemptAt = Date.now();
		health.lastStatusCode =
			statusCode ?? (error instanceof LlmProviderError ? error.statusCode : null);
		health.lastError = error instanceof Error ? error.message : String(error);

		let cooldownMs = this.cbConfig.serverErrorCooldownMs;

		if (health.lastStatusCode === 429) {
			cooldownMs = this.cbConfig.rateLimitCooldownMs;
		} else if (health.lastStatusCode === 401 || health.lastStatusCode === 403) {
			cooldownMs = this.cbConfig.authErrorCooldownMs;
		} else if (health.lastStatusCode === 408) {
			cooldownMs = this.cbConfig.timeoutCooldownMs;
		}

		if (
			health.consecutiveFailures >= this.cbConfig.maxConsecutiveFailures ||
			health.lastStatusCode === 429
		) {
			health.state = "open";
			health.cooldownUntil = Date.now() + cooldownMs;
		}
	}

	public resetCircuitBreakers(providerId?: LlmProviderId): void {
		if (providerId) {
			const health = this.healthMap.get(providerId);
			if (health) {
				health.state = "closed";
				health.consecutiveFailures = 0;
				health.cooldownUntil = 0;
				health.lastError = null;
				health.lastStatusCode = null;
			}
		} else {
			for (const health of this.healthMap.values()) {
				health.state = "closed";
				health.consecutiveFailures = 0;
				health.cooldownUntil = 0;
				health.lastError = null;
				health.lastStatusCode = null;
			}
		}
	}

	/**
	 * Resolves effective provider fallback chain for the request.
	 */
	public resolveFallbackChain(options: ChatOptions): LlmProviderId[] {
		const specified =
			options.fallbackChain ||
			options.clinicAiSettings?.fallbackChain;

		if (specified && specified.length > 0) {
			const chain: LlmProviderId[] = [];
			const defaultProv = options.clinicAiSettings?.defaultProvider;
			if (defaultProv && !specified.includes(defaultProv)) {
				chain.push(defaultProv);
			}
			for (const prov of specified) {
				if (!chain.includes(prov)) {
					chain.push(prov);
				}
			}
			return chain;
		}

		const defaultProv = options.clinicAiSettings?.defaultProvider;
		const chain: LlmProviderId[] = [];
		if (defaultProv) {
			chain.push(defaultProv);
		}

		for (const def of DEFAULT_FALLBACK_CHAIN) {
			if (!chain.includes(def)) {
				chain.push(def);
			}
		}

		return chain;
	}

	/**
	 * Stream completions through primary provider with automatic Circuit Breaker failover.
	 */
	public async *chatStream(
		messages: ProviderMessage[],
		tools: (AgentTool | Record<string, unknown>)[] = [],
		options: ChatOptions = {},
	): AsyncIterable<LlmStreamChunk> {
		const fallbackChain = this.resolveFallbackChain(options);
		const attemptedErrors: Array<{
			providerId: LlmProviderId;
			error: string;
			statusCode: number | null;
		}> = [];

		for (const providerId of fallbackChain) {
			const adapter = this.adapters.get(providerId);
			if (!adapter) {
				continue;
			}

			const health = this.getProviderHealth(providerId);
			const now = Date.now();

			// If circuit breaker is OPEN, skip this provider unless in half_open test mode
			if (health.state === "open" && health.cooldownUntil > now) {
				attemptedErrors.push({
					providerId,
					error: `Circuit breaker OPEN until ${new Date(health.cooldownUntil).toISOString()}`,
					statusCode: 429,
				});
				continue;
			}

			let emittedAny = false;
			try {
				const stream = adapter.chatStream(messages, tools, options);

				for await (const chunk of stream) {
					if (!emittedAny) {
						emittedAny = true;
						this.recordSuccess(providerId);
					}
					yield chunk;
				}

				// If generator completed cleanly without throwing, return
				return;
			} catch (err: unknown) {
				const statusCode =
					err instanceof LlmProviderError ? err.statusCode : null;
				const errMsg = err instanceof Error ? err.message : String(err);

				this.recordFailure(providerId, err, statusCode);
				attemptedErrors.push({
					providerId,
					error: errMsg,
					statusCode,
				});

				// If tokens were already sent to client, do not corrupt stream with a restarted provider
				if (emittedAny) {
					throw err;
				}

				// Move to next provider in fallback chain
				continue;
			}
		}

		// If all providers failed, throw aggregated exhausted error
		throw new OmniGatewayExhaustedError(attemptedErrors);
	}

	/**
	 * Executes chat completion requesting structured JSON output conforming to a Zod schema.
	 */
	public async generateStructuredJson<T>(
		schema: z.ZodType<T>,
		messages: ProviderMessage[],
		options: ChatOptions = {},
	): Promise<{ data: T; usage?: UsageChunk; rawText: string }> {
		const jsonSchema = zodToJsonSchema(schema);
		const systemInstruction = [
			options.system ?? "You are a specialized clinical AI assistant.",
			"IMPORTANT: Your response MUST be a valid JSON object strictly matching this JSON Schema:",
			JSON.stringify(jsonSchema, null, 2),
			"Do not include any introductory commentary, explanation, markdown formatting tags, or conversational filler outside the JSON object.",
		].join("\n\n");

		const chatOptions: ChatOptions = {
			...options,
			system: systemInstruction,
			responseFormat: { type: "json_object" },
		};

		let rawText = "";
		let usage: UsageChunk | undefined;

		for await (const chunk of this.chatStream(messages, [], chatOptions)) {
			if (chunk.type === "text_delta") {
				rawText += chunk.text;
			} else if (chunk.type === "usage") {
				usage = chunk;
			}
		}

		const cleaned = rawText
			.replace(/^```(?:json)?\s*/i, "")
			.replace(/\s*```$/, "")
			.trim();

		let parsedJson: unknown;
		try {
			parsedJson = JSON.parse(cleaned);
		} catch (parseErr) {
			throw new Error(
				`Failed to parse model output as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\nRaw output was:\n${rawText}`,
			);
		}

		const validated = schema.safeParse(parsedJson);
		if (!validated.success) {
			const issues = validated.error.issues
				.map((i) => `${i.path.join(".")}: ${i.message}`)
				.join("; ");
			throw new Error(`Model JSON output failed Zod schema validation: ${issues}`);
		}

		return {
			data: validated.data,
			...(usage !== undefined ? { usage } : {}),
			rawText,
		};
	}

	/**
	 * Bridge adaptor converting OmniLlmGateway to standard LLMProvider interface
	 * for seamless drop-in integration into AgentOrchestrator and CopilotService.
	 */
	public asLlmProvider(defaultOptions: ChatOptions = {}): LLMProvider {
		const gateway = this;

		return {
			complete(params: {
				system: string;
				messages: ProviderMessage[];
				tools?: Record<string, unknown>[];
				model?: string;
				maxTokens?: number;
				temperature?: number;
			}): AsyncIterable<LLMStreamEvent> {
				async function* bridgeGenerator(): AsyncGenerator<LLMStreamEvent, void, unknown> {
					const chatOptions: ChatOptions = {
						...defaultOptions,
						system: params.system,
						...(params.model !== undefined ? { modelId: params.model } : {}),
						...(params.maxTokens !== undefined ? { maxTokens: params.maxTokens } : {}),
						...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
					};

					const tools = (params.tools ?? []) as (AgentTool | Record<string, unknown>)[];
					const stream = gateway.chatStream(params.messages, tools, chatOptions);

					for await (const chunk of stream) {
						if (chunk.type === "text_delta") {
							yield { type: "text_delta", text: chunk.text };
						} else if (chunk.type === "tool_call_end") {
							let inputObj: Record<string, unknown> = {};
							if (typeof chunk.arguments === "object" && chunk.arguments !== null) {
								inputObj = chunk.arguments as Record<string, unknown>;
							} else if (typeof chunk.arguments === "string") {
								try {
									inputObj = JSON.parse(chunk.arguments);
								} catch {
									inputObj = { raw: chunk.arguments };
								}
							}
							yield {
								type: "tool_use",
								id: chunk.id,
								name: chunk.name,
								input: inputObj,
							};
						} else if (chunk.type === "usage") {
							yield {
								type: "usage",
								inputTokens: chunk.inputTokens,
								outputTokens: chunk.outputTokens,
							};
						} else if (chunk.type === "done") {
							yield {
								type: "done",
								stopReason: chunk.stopReason,
							};
						}
					}
				}

				return bridgeGenerator();
			},
		};
	}
}

export const omniLlmGateway = new OmniLlmGateway();
export const defaultOmniLlmProvider = omniLlmGateway.asLlmProvider();
