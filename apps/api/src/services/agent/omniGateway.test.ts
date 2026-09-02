/**
 * omniGateway.test.ts — Comprehensive Test Suite for Omni-LLM Gateway & Provider Adapters.
 * Tests OpenAI, Anthropic, Groq, Gemini, DeepSeek adapters, Circuit Breaker failover, and SSE streaming.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { z } from "zod";
import { AnthropicProviderAdapter } from "./providers/anthropic.js";
import { DeepSeekProviderAdapter } from "./providers/deepseek.js";
import { GeminiProviderAdapter } from "./providers/gemini.js";
import { GroqProviderAdapter } from "./providers/groq.js";
import { OpenAiProviderAdapter } from "./providers/openai.js";
import {
	createSseResponse,
	formatSseStreamChunk,
	LlmProviderError,
	OmniGatewayExhaustedError,
	OmniLlmGateway,
	validateToolCallArgs,
	type LlmStreamChunk,
	type ProviderConfig,
} from "./omniGateway.js";
import type { ProviderMessage } from "./types.js";
import {
	getProviderKeyCandidates,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	resetProviderKeyCooldowns,
	selectProviderKey,
	type SpeechProviderKeyCandidate,
} from "../../speech/keyPool.js";
import { getGlobalProxyUrl, parseProxyUrl } from "./proxyDispatcher.js";

/**
 * Creates a mock ReadableStream yielding SSE chunks.
 */
function createMockSseResponse(sseChunks: string[], status = 200, statusText = "OK"): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of sseChunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});

	return new Response(stream, {
		status,
		statusText,
		headers: { "Content-Type": "text/event-stream" },
	});
}

describe("Omni-LLM Provider Adapters Suite", () => {
	const sampleMessages: ProviderMessage[] = [
		{ role: "user", content: "Каковы симптомы пульпита зуба 16?" },
	];

	const sampleTools = [
		{
			name: "clinical_find_patient",
			description: "Finds patient medical record",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string" },
				},
				required: ["query"],
			},
		},
	];

	test("1. OpenAI Provider Adapter — Stream text, tool calls, thinking, and usage", async () => {
		const adapter = new OpenAiProviderAdapter();
		assert.strictEqual(adapter.providerId, "openai");
		assert.strictEqual(adapter.defaultModel, "gpt-4o");

		const mockSse = [
			'data: {"choices":[{"delta":{"role":"assistant","reasoning_content":"Анализирую МКБ-10..."}}]}\n\n',
			'data: {"choices":[{"delta":{"content":"Острая пульсирующая "}}]}\n\n',
			'data: {"choices":[{"delta":{"content":"боль в области зуба 16."}}]}\n\n',
			'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_openai_1","function":{"name":"clinical_find_patient","arguments":"{\\"query\\":\\""}}]}}]}\n\n',
			'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"Иванов\\"}"}}]}}]}\n\n',
			'data: {"choices":[{"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":25,"completion_tokens":40,"total_tokens":65}}\n\n',
			"data: [DONE]\n\n",
		];

		const mockFetch: typeof fetch = async () => createMockSseResponse(mockSse);

		const chunks: LlmStreamChunk[] = [];
		for await (const chunk of adapter.chatStream(sampleMessages, sampleTools, {
			clinicAiSettings: {
				providers: {
					openai: { apiKey: "sk-mock-openai-key" },
				},
			},
			fetchFn: mockFetch,
		})) {
			chunks.push(chunk);
		}

		assert.ok(chunks.length >= 5, "Should emit multiple stream chunks");

		const thinking = chunks.find((c) => c.type === "thinking_delta");
		assert.ok(thinking && thinking.type === "thinking_delta");
		assert.strictEqual(thinking.text, "Анализирую МКБ-10...");

		const textChunks = chunks.filter((c) => c.type === "text_delta");
		const fullText = textChunks.map((c) => (c as any).text).join("");
		assert.strictEqual(fullText, "Острая пульсирующая боль в области зуба 16.");

		const toolStart = chunks.find((c) => c.type === "tool_call_start");
		assert.ok(toolStart && toolStart.type === "tool_call_start");
		assert.strictEqual(toolStart.name, "clinical_find_patient");

		const toolEnd = chunks.find((c) => c.type === "tool_call_end");
		assert.ok(toolEnd && toolEnd.type === "tool_call_end");
		assert.deepStrictEqual(toolEnd.arguments, { query: "Иванов" });

		const usage = chunks.find((c) => c.type === "usage");
		assert.ok(usage && usage.type === "usage");
		assert.strictEqual(usage.inputTokens, 25);
		assert.strictEqual(usage.outputTokens, 40);

		const done = chunks.find((c) => c.type === "done");
		assert.ok(done && done.type === "done");
	});

	test("2. Anthropic Provider Adapter — Stream Claude 3.7 messages, thinking, and tool_use", async () => {
		const adapter = new AnthropicProviderAdapter();
		assert.strictEqual(adapter.providerId, "anthropic");
		assert.strictEqual(adapter.defaultModel, "claude-3-7-sonnet-20250219");

		const mockSse = [
			'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":30}}}\n\n',
			'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}\n\n',
			'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Проверяю протокол СанПиН..."}}\n\n',
			"event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":0}\n\n",
			'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}\n\n',
			'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Диагноз: К04.0 Пульпит."}}\n\n',
			"event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":1}\n\n",
			'event: content_block_start\ndata: {"type":"content_block_start","index":2,"content_block":{"type":"tool_use","id":"tool_claude_1","name":"clinical_find_patient"}}\n\n',
			'event: content_block_delta\ndata: {"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"Смирнов\\"}"}}\n\n',
			"event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":2}\n\n",
			'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":55}}\n\n',
			'event: message_stop\ndata: {"type":"message_stop"}\n\n',
		];

		const mockFetch: typeof fetch = async () => createMockSseResponse(mockSse);

		const chunks: LlmStreamChunk[] = [];
		for await (const chunk of adapter.chatStream(sampleMessages, sampleTools, {
			clinicAiSettings: {
				providers: {
					anthropic: { apiKey: "sk-ant-mock-key" },
				},
			},
			fetchFn: mockFetch,
		})) {
			chunks.push(chunk);
		}

		const thinking = chunks.find((c) => c.type === "thinking_delta");
		assert.ok(thinking && thinking.type === "thinking_delta");
		assert.strictEqual(thinking.text, "Проверяю протокол СанПиН...");

		const text = chunks.find((c) => c.type === "text_delta");
		assert.ok(text && text.type === "text_delta");
		assert.strictEqual(text.text, "Диагноз: К04.0 Пульпит.");

		const toolStart = chunks.find((c) => c.type === "tool_call_start");
		assert.ok(toolStart && toolStart.type === "tool_call_start");
		assert.strictEqual(toolStart.id, "tool_claude_1");
		assert.strictEqual(toolStart.name, "clinical_find_patient");

		const toolEnd = chunks.find((c) => c.type === "tool_call_end");
		assert.ok(toolEnd && toolEnd.type === "tool_call_end");
		assert.deepStrictEqual(toolEnd.arguments, { query: "Смирнов" });

		const usage = chunks.find((c) => c.type === "usage");
		assert.ok(usage && usage.type === "usage");
		assert.strictEqual(usage.inputTokens, 30);
		assert.strictEqual(usage.outputTokens, 55);
	});

	test("3. Groq Provider Adapter — Low latency stream & Llama 3.3", async () => {
		const adapter = new GroqProviderAdapter();
		assert.strictEqual(adapter.providerId, "groq");
		assert.strictEqual(adapter.defaultModel, "qwen/qwen3.8-27b");

		const mockSse = [
			'data: {"choices":[{"delta":{"content":"План лечения составлен."}}]}\n\n',
			'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":15,"completion_tokens":10,"total_tokens":25}}\n\n',
			"data: [DONE]\n\n",
		];

		const mockFetch: typeof fetch = async () => createMockSseResponse(mockSse);

		const chunks: LlmStreamChunk[] = [];
		for await (const chunk of adapter.chatStream(sampleMessages, [], {
			clinicAiSettings: {
				providers: {
					groq: { apiKey: "gsk_mock_key" },
				},
			},
			fetchFn: mockFetch,
		})) {
			chunks.push(chunk);
		}

		const text = chunks.find((c) => c.type === "text_delta");
		assert.ok(text && text.type === "text_delta");
		assert.strictEqual(text.text, "План лечения составлен.");

		const done = chunks.find((c) => c.type === "done");
		assert.ok(done && done.type === "done");
		assert.strictEqual(done.stopReason, "stop");
	});

	test("4. Google Gemini Provider Adapter — Native REST SSE & Function Calls", async () => {
		const adapter = new GeminiProviderAdapter();
		assert.strictEqual(adapter.providerId, "gemini");
		assert.strictEqual(adapter.defaultModel, "gemini-3.5-flash-lite");

		const mockSse = [
			'data: {"candidates":[{"content":{"parts":[{"text":"Найдена карта пациента."}],"role":"model"}}],"usageMetadata":{"promptTokenCount":18,"candidatesTokenCount":12,"totalTokenCount":30}}\n\n',
			'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"clinical_find_patient","args":{"query":"Петров"}}}],"role":"model"},"finishReason":"STOP"}]}\n\n',
		];

		const mockFetch: typeof fetch = async () => createMockSseResponse(mockSse);

		const chunks: LlmStreamChunk[] = [];
		for await (const chunk of adapter.chatStream(sampleMessages, sampleTools, {
			clinicAiSettings: {
				providers: {
					gemini: { apiKey: "AIzaSyMockKey" },
				},
			},
			fetchFn: mockFetch,
		})) {
			chunks.push(chunk);
		}

		const text = chunks.find((c) => c.type === "text_delta");
		assert.ok(text && text.type === "text_delta");
		assert.strictEqual(text.text, "Найдена карта пациента.");

		const toolEnd = chunks.find((c) => c.type === "tool_call_end");
		assert.ok(toolEnd && toolEnd.type === "tool_call_end");
		assert.strictEqual(toolEnd.name, "clinical_find_patient");
		assert.deepStrictEqual(toolEnd.arguments, { query: "Петров" });

		const usage = chunks.find((c) => c.type === "usage");
		assert.ok(usage && usage.type === "usage");
		assert.strictEqual(usage.inputTokens, 18);
		assert.strictEqual(usage.outputTokens, 12);
	});

	test("5. DeepSeek Provider Adapter — DeepSeek-Reasoner R1 reasoning_content", async () => {
		const adapter = new DeepSeekProviderAdapter();
		assert.strictEqual(adapter.providerId, "deepseek");
		assert.strictEqual(adapter.defaultModel, "deepseek-chat");

		const mockSse = [
			'data: {"choices":[{"delta":{"reasoning_content":"Размышляю над дифференциальной диагностикой..."}}]}\n\n',
			'data: {"choices":[{"delta":{"content":"Рекомендуется ЭОД и прицельный снимок."}}]}\n\n',
			'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":40,"completion_tokens":20,"total_tokens":60}}\n\n',
			"data: [DONE]\n\n",
		];

		const mockFetch: typeof fetch = async () => createMockSseResponse(mockSse);

		const chunks: LlmStreamChunk[] = [];
		for await (const chunk of adapter.chatStream(sampleMessages, [], {
			modelId: "deepseek-reasoner",
			clinicAiSettings: {
				providers: {
					deepseek: { apiKey: "sk-deepseek-mock-key" },
				},
			},
			fetchFn: mockFetch,
		})) {
			chunks.push(chunk);
		}

		const thinking = chunks.find((c) => c.type === "thinking_delta");
		assert.ok(thinking && thinking.type === "thinking_delta");
		assert.strictEqual(
			thinking.text,
			"Размышляю над дифференциальной диагностикой...",
		);

		const text = chunks.find((c) => c.type === "text_delta");
		assert.ok(text && text.type === "text_delta");
		assert.strictEqual(
			text.text,
			"Рекомендуется ЭОД и прицельный снимок.",
		);
	});
});

describe("OmniLlmGateway Circuit Breaker & Failover Suite", () => {
	const sampleMessages: ProviderMessage[] = [
		{ role: "user", content: "Тестовое сообщение" },
	];

	test("6. Automatic Failover: DeepSeek (429) -> Groq (500) -> Gemini (429) -> OpenAI (200 OK)", async () => {
		const gateway = new OmniLlmGateway();
		const callHistory: string[] = [];

		const mockFetch: typeof fetch = async (url) => {
			const urlStr = String(url);
			if (urlStr.includes("deepseek.com")) {
				callHistory.push("deepseek_429");
				return new Response("Too Many Requests", { status: 429, statusText: "Too Many Requests" });
			}
			if (urlStr.includes("groq.com")) {
				callHistory.push("groq_500");
				return new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" });
			}
			if (urlStr.includes("generativelanguage.googleapis.com")) {
				callHistory.push("gemini_429");
				return new Response("Resource Exhausted", { status: 429, statusText: "Too Many Requests" });
			}
			if (urlStr.includes("openai.com")) {
				callHistory.push("openai_200");
				const sse = [
					'data: {"choices":[{"delta":{"content":"Ответ от резервного OpenAI"}}]}\n\n',
					'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
					"data: [DONE]\n\n",
				];
				return createMockSseResponse(sse);
			}
			return new Response("Not Found", { status: 404 });
		};

		const settings = {
			fallbackChain: ["deepseek", "groq", "gemini", "openai"] as const,
			providers: {
				deepseek: { apiKey: "key_ds" },
				groq: { apiKey: "key_groq" },
				gemini: { apiKey: "key_gemini" },
				openai: { apiKey: "key_openai" },
			},
		};

		const chunks: LlmStreamChunk[] = [];
		for await (const chunk of gateway.chatStream(sampleMessages, [], {
			clinicAiSettings: settings,
			fetchFn: mockFetch,
		})) {
			chunks.push(chunk);
		}

		assert.deepStrictEqual(callHistory, [
			"deepseek_429",
			"groq_500",
			"gemini_429",
			"openai_200",
		]);

		const text = chunks.find((c) => c.type === "text_delta");
		assert.ok(text && text.type === "text_delta");
		assert.strictEqual(text.text, "Ответ от резервного OpenAI");

		// Verify Circuit Breaker States
		const dsHealth = gateway.getProviderHealth("deepseek");
		assert.strictEqual(dsHealth.state, "open");
		assert.strictEqual(dsHealth.lastStatusCode, 429);

		const groqHealth = gateway.getProviderHealth("groq");
		assert.strictEqual(groqHealth.failures, 1);
		assert.strictEqual(groqHealth.lastStatusCode, 500);

		const openAiHealth = gateway.getProviderHealth("openai");
		assert.strictEqual(openAiHealth.state, "closed");
		assert.strictEqual(openAiHealth.successes, 1);
	});

	test("7. Circuit Breaker skips OPEN provider on subsequent calls without HTTP request", async () => {
		const gateway = new OmniLlmGateway({ rateLimitCooldownMs: 100_000 });
		const callHistory: string[] = [];

		const mockFetch: typeof fetch = async (url) => {
			const urlStr = String(url);
			if (urlStr.includes("deepseek.com")) {
				callHistory.push("deepseek_429");
				return new Response("Too Many Requests", { status: 429 });
			}
			if (urlStr.includes("groq.com")) {
				callHistory.push("groq_200");
				const sse = [
					'data: {"choices":[{"delta":{"content":"Ответ от Groq"}}]}\n\n',
					'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
					"data: [DONE]\n\n",
				];
				return createMockSseResponse(sse);
			}
			return new Response("Not Found", { status: 404 });
		};

		const settings = {
			fallbackChain: ["deepseek", "groq"] as const,
			providers: {
				deepseek: { apiKey: "key_ds" },
				groq: { apiKey: "key_groq" },
			},
		};

		// Turn 1: DeepSeek fails with 429 -> Circuit Breaker trips to OPEN -> Fallback to Groq
		for await (const _ of gateway.chatStream(sampleMessages, [], {
			clinicAiSettings: settings,
			fetchFn: mockFetch,
		})) {}

		assert.deepStrictEqual(callHistory, ["deepseek_429", "groq_200"]);

		// Turn 2: DeepSeek is now OPEN -> Should be SKIPPED directly, calling Groq immediately!
		callHistory.length = 0;
		for await (const _ of gateway.chatStream(sampleMessages, [], {
			clinicAiSettings: settings,
			fetchFn: mockFetch,
		})) {}

		assert.deepStrictEqual(
			callHistory,
			["groq_200"],
			"DeepSeek must be bypassed due to OPEN circuit breaker",
		);
	});

	test("8. OmniGatewayExhaustedError when all providers fail", async () => {
		const gateway = new OmniLlmGateway();
		const mockFetch: typeof fetch = async () =>
			new Response("Service Unavailable", { status: 503 });

		const settings = {
			fallbackChain: ["groq", "openai"] as const,
			providers: {
				groq: { apiKey: "key_groq" },
				openai: { apiKey: "key_openai" },
			},
		};

		let caughtError: OmniGatewayExhaustedError | null = null;
		try {
			for await (const _ of gateway.chatStream(sampleMessages, [], {
				clinicAiSettings: settings,
				fetchFn: mockFetch,
			})) {}
		} catch (err) {
			if (err instanceof OmniGatewayExhaustedError) {
				caughtError = err;
			}
		}

		assert.ok(caughtError, "Should throw OmniGatewayExhaustedError");
		assert.strictEqual(caughtError.attemptedProviders.length, 2);
		assert.strictEqual(caughtError.attemptedProviders[0]!.providerId, "groq");
		assert.strictEqual(caughtError.attemptedProviders[1]!.providerId, "openai");
	});

	test("9. Bridge asLlmProvider adapts to standard LLMProvider interface", async () => {
		const gateway = new OmniLlmGateway();
		const mockFetch: typeof fetch = async () => {
			const sse = [
				'data: {"choices":[{"delta":{"content":"Здравствуйте! Готов помочь."}}]}\n\n',
				'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_bridge_1","function":{"name":"clinical_find_patient","arguments":"{\\"query\\":\\"Иванов\\"}"}}]}}]}\n\n',
				'data: {"choices":[{"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":10,"completion_tokens":20}}\n\n',
				"data: [DONE]\n\n",
			];
			return createMockSseResponse(sse);
		};

		const provider = gateway.asLlmProvider({
			clinicAiSettings: {
				defaultProvider: "openai",
				providers: { openai: { apiKey: "sk-mock-key" } },
			},
			fetchFn: mockFetch,
		});

		const events: any[] = [];
		for await (const ev of provider.complete({
			system: "You are a clinical assistant",
			messages: sampleMessages,
		})) {
			events.push(ev);
		}

		const textDelta = events.find((e) => e.type === "text_delta");
		assert.ok(textDelta && textDelta.type === "text_delta");
		assert.strictEqual(textDelta.text, "Здравствуйте! Готов помочь.");

		const toolUse = events.find((e) => e.type === "tool_use");
		assert.ok(toolUse && toolUse.type === "tool_use");
		assert.strictEqual(toolUse.name, "clinical_find_patient");
		assert.deepStrictEqual(toolUse.input, { query: "Иванов" });

		const usage = events.find((e) => e.type === "usage");
		assert.ok(usage && usage.type === "usage");
		assert.strictEqual(usage.inputTokens, 10);
		assert.strictEqual(usage.outputTokens, 20);

		const done = events.find((e) => e.type === "done");
		assert.ok(done && done.type === "done");
	});

	test("10. Mid-stream failure protection: Throws immediately on mid-stream error without corrupting output stream", async () => {
		const gateway = new OmniLlmGateway();
		const callHistory: string[] = [];

		const mockFetch: typeof fetch = async (url) => {
			const urlStr = String(url);
			if (urlStr.includes("deepseek.com")) {
				callHistory.push("deepseek_partial_then_crash");
				// Create a stream that emits 1 chunk and then aborts / throws
				const encoder = new TextEncoder();
				let pullCount = 0;
				const stream = new ReadableStream<Uint8Array>({
					pull(controller) {
						if (pullCount === 0) {
							pullCount++;
							controller.enqueue(
								encoder.encode('data: {"choices":[{"delta":{"content":"Первая часть фразы..."}}]}\n\n'),
							);
						} else {
							controller.error(new Error("Socket connection reset by peer mid-stream"));
						}
					},
				});
				return new Response(stream, {
					status: 200,
					headers: { "Content-Type": "text/event-stream" },
				});
			}
			if (urlStr.includes("groq.com")) {
				callHistory.push("groq_corrupted_restart");
				const sse = [
					'data: {"choices":[{"delta":{"content":"Новый ответ от Groq с нуля"}}]}\n\n',
					'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
					"data: [DONE]\n\n",
				];
				return createMockSseResponse(sse);
			}
			return new Response("Not Found", { status: 404 });
		};

		const settings = {
			fallbackChain: ["deepseek", "groq"] as const,
			providers: {
				deepseek: { apiKey: "key_ds" },
				groq: { apiKey: "key_groq" },
			},
		};

		const chunks: LlmStreamChunk[] = [];
		let thrownError: Error | null = null;
		try {
			for await (const chunk of gateway.chatStream(sampleMessages, [], {
				clinicAiSettings: settings,
				fetchFn: mockFetch,
			})) {
				chunks.push(chunk);
			}
		} catch (err: any) {
			thrownError = err;
		}

		assert.ok(thrownError, "Should throw error on mid-stream failure");
		assert.ok(
			thrownError.message.includes("Socket connection reset"),
			`Expected socket reset error, got: ${thrownError.message}`,
		);

		// Verify that Groq was NEVER called because DeepSeek had already emitted tokens to the client!
		assert.deepStrictEqual(
			callHistory,
			["deepseek_partial_then_crash"],
			"Must not switch to next provider mid-stream if tokens were already emitted",
		);

		assert.strictEqual(chunks.length, 1);
		assert.strictEqual((chunks[0] as any).text, "Первая часть фразы...");
	});

	test("8. KeyPool Multi-Key Round-Robin & Gemini 8-Key / Groq 7-Key Pool Rotation", async () => {
		const savedEnv = { ...process.env };
		try {
			delete process.env.GEMINI_API_KEY;
			delete process.env.GOOGLE_API_KEY;
			delete process.env.GEMINI_API_KEYS;
			delete process.env.GROQ_API_KEY;
			delete process.env.GROQ_API_KEYS;

			// Simulate 8 Gemini keys
			process.env.GEMINI_API_KEY_1 = "gemini_key_alpha";
			process.env.GEMINI_API_KEY_2 = "gemini_key_beta";
			process.env.GEMINI_API_KEY_3 = "gemini_key_gamma";
			process.env.GEMINI_API_KEY_4 = "gemini_key_delta";
			process.env.GEMINI_API_KEY_5 = "gemini_key_epsilon";
			process.env.GEMINI_API_KEY_6 = "gemini_key_zeta";
			process.env.GEMINI_API_KEY_7 = "gemini_key_eta";
			process.env.GEMINI_API_KEY_8 = "gemini_key_theta";

			// Simulate 7 Groq keys
			process.env.GROQ_API_KEY_1 = "groq_key_1";
			process.env.GROQ_API_KEY_2 = "groq_key_2";
			process.env.GROQ_API_KEY_3 = "groq_key_3";
			process.env.GROQ_API_KEY_4 = "groq_key_4";
			process.env.GROQ_API_KEY_5 = "groq_key_5";
			process.env.GROQ_API_KEY_6 = "groq_key_6";
			process.env.GROQ_API_KEY_7 = "groq_key_7";

			resetProviderKeyCooldowns("gemini");
			resetProviderKeyCooldowns("groq");

			const geminiCandidates = getProviderKeyCandidates("gemini");
			assert.strictEqual(geminiCandidates.length, 8, "Should discover exactly 8 Gemini keys");

			const groqCandidates = getProviderKeyCandidates("groq");
			assert.strictEqual(groqCandidates.length, 7, "Should discover exactly 7 Groq keys");

			// Test round-robin cycling
			const triedGemini = new Set<string>();
			const picked1 = selectProviderKey("gemini", triedGemini, "round_robin");
			assert.ok(picked1, "Should pick first candidate");
			triedGemini.add(picked1.fingerprint);

			const picked2 = selectProviderKey("gemini", triedGemini, "round_robin");
			assert.ok(picked2, "Should pick second candidate");
			assert.notStrictEqual(picked1.value, picked2.value, "Round-robin must return a different key");

			// Test Gemini Adapter with 8 keys failover on 429 until healthy key succeeds
			const adapter = new GeminiProviderAdapter();
			const triedKeys: string[] = [];

			const mockFetch: typeof fetch = async (url) => {
				const urlStr = String(url);
				const keyParam = new URL(urlStr).searchParams.get("key") || "";
				triedKeys.push(keyParam);

				// Fail first 2 tried keys with 429 Rate Limit, 3rd key succeeds
				if (triedKeys.length <= 2) {
					return new Response(JSON.stringify({ error: { code: 429, message: "RESOURCE_EXHAUSTED" } }), {
						status: 429,
						headers: { "Content-Type": "application/json" },
					});
				}

				const sse = [
					'data: {"candidates":[{"content":{"parts":[{"text":"Клинический диагноз: Хронический пульпит"}]}}]}\n\n',
				];
				return createMockSseResponse(sse);
			};

			const chunks: LlmStreamChunk[] = [];
			for await (const chunk of adapter.chatStream(
				[{ role: "user", content: "Диагноз зуба 16?" }],
				[],
				{ fetchFn: mockFetch },
			)) {
				chunks.push(chunk);
			}

			assert.ok(triedKeys.length >= 3, "Should have attempted failover across keys");
			const textChunks = chunks.filter((c) => c.type === "text_delta");
			const resultText = textChunks.map((c) => (c as any).text).join("");
			assert.strictEqual(resultText, "Клинический диагноз: Хронический пульпит");
		} finally {
			process.env = savedEnv;
			resetProviderKeyCooldowns("gemini");
			resetProviderKeyCooldowns("groq");
		}
	});

	test("9. KeyPool Exponential Backoff on 429 Rate Limits", () => {
		const savedEnv = { ...process.env };
		try {
			delete process.env.GEMINI_API_KEY;
			delete process.env.GOOGLE_API_KEY;
			delete process.env.GEMINI_API_KEYS;
			process.env.GEMINI_API_KEY_1 = "test_key_backoff";

			resetProviderKeyCooldowns("gemini");

			const candidates = getProviderKeyCandidates("gemini");
			assert.strictEqual(candidates.length, 1);
			const candidate = candidates[0]!;

			// 1st failure (429) -> consecutive = 1 -> backoff = base * 2^0 = 1x
			const err429 = new LlmProviderError("Rate limit", { providerId: "gemini", statusCode: 429 });
			recordProviderKeyFailure("gemini", candidate, err429);

			const tried = new Set<string>();
			const selectedDuringCooldown = selectProviderKey("gemini", tried);
			// Should not select during cooldown if no other candidates
			assert.strictEqual(selectedDuringCooldown, null, "Should not select cooling down key");

			// Success resets consecutive failures
			recordProviderKeySuccess("gemini", candidate);
			resetProviderKeyCooldowns("gemini");
			const selectedAfterSuccess = selectProviderKey("gemini", tried);
			assert.ok(selectedAfterSuccess, "Should select key after reset / success");
		} finally {
			process.env = savedEnv;
			resetProviderKeyCooldowns("gemini");
		}
	});

	test("10. SOCKS5 & GLOBAL_LLM_PROXY_URL Resolution", () => {
		const savedEnv = { ...process.env };
		try {
			const targetProxy = "socks5://dente_proxy:DenteSecureSocks2026!@62.84.100.97:1080";
			process.env.GLOBAL_LLM_PROXY_URL = targetProxy;

			const resolved = getGlobalProxyUrl();
			assert.strictEqual(resolved, targetProxy, "Must resolve GLOBAL_LLM_PROXY_URL");

			const parsed = parseProxyUrl(resolved);
			assert.ok(parsed, "Must parse SOCKS5 proxy successfully");
			assert.strictEqual(parsed.protocol, "socks5");
			assert.strictEqual(parsed.host, "62.84.100.97");
			assert.strictEqual(parsed.port, 1080);
			assert.strictEqual(parsed.username, "dente_proxy");
			assert.strictEqual(parsed.password, "DenteSecureSocks2026!");
		} finally {
			process.env = savedEnv;
		}
	});

	test("11. Tool Calling Argument Validation with Zod Schema", () => {
		const schema = z.object({
			patientId: z.string().min(3),
			toothNumber: z.number().int().min(11).max(48),
			notes: z.string().optional(),
		});

		const validTool = {
			name: "create_tooth_record",
			parameters: schema,
		};

		// Valid args
		const validResult = validateToolCallArgs(validTool, {
			patientId: "pat_123",
			toothNumber: 16,
		});
		assert.strictEqual(validResult.ok, true);
		if (validResult.ok) {
			assert.strictEqual(validResult.data.toothNumber, 16);
		}

		// Invalid args (wrong tooth number)
		const invalidResult = validateToolCallArgs(validTool, {
			patientId: "pat_123",
			toothNumber: 99, // Invalid tooth number
		});
		assert.strictEqual(invalidResult.ok, false);
		if (!invalidResult.ok) {
			assert.ok(invalidResult.error.includes("Invalid arguments for tool 'create_tooth_record'"));
		}
	});

	test("12. Structured JSON Generation with Schema Validation", async () => {
		const gateway = new OmniLlmGateway();

		const analysisSchema = z.object({
			diagnosis: z.string(),
			icd10Code: z.string(),
			severity: z.enum(["low", "medium", "high"]),
		});

		const mockFetch: typeof fetch = async () => {
			const mockSse = [
				'data: {"choices":[{"delta":{"content":"{\\"diagnosis\\":\\"Кариес дентина\\",\\"icd10Code\\":\\"K02.1\\",\\"severity\\":\\"medium\\"}"}}]}\n\n',
				'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
				"data: [DONE]\n\n",
			];
			return createMockSseResponse(mockSse);
		};

		const result = await gateway.generateStructuredJson(
			analysisSchema,
			[{ role: "user", content: "Диагностируй зуб 36" }],
			{
				fallbackChain: ["openai"],
				clinicAiSettings: {
					providers: {
						openai: { apiKey: "sk_openai_test" },
					},
				},
				fetchFn: mockFetch,
			},
		);

		assert.strictEqual(result.data.diagnosis, "Кариес дентина");
		assert.strictEqual(result.data.icd10Code, "K02.1");
		assert.strictEqual(result.data.severity, "medium");
	});

	test("13. SSE Wire Helpers: formatSseStreamChunk and createSseResponse", async () => {
		const chunk: LlmStreamChunk = {
			type: "text_delta",
			text: "Тестовый токен для стриминга",
		};

		const formatted = formatSseStreamChunk(chunk);
		assert.ok(formatted.startsWith("event: text_delta\n"));
		assert.ok(formatted.includes('"text":"Тестовый токен для стриминга"'));
		assert.ok(formatted.endsWith("\n\n"));

		// Test createSseResponse
		async function* sampleStream(): AsyncIterable<LlmStreamChunk> {
			yield { type: "thinking_delta", text: "Думаю..." };
			yield { type: "text_delta", text: "Готово." };
			yield { type: "done", stopReason: "stop" };
		}

		const response = createSseResponse(sampleStream());
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.headers.get("Content-Type"), "text/event-stream; charset=utf-8");

		const reader = response.body?.getReader();
		assert.ok(reader, "Must have readable stream body");
		const textDecoder = new TextDecoder();
		let accumulated = "";
		while (true) {
			const { done, value } = await reader!.read();
			if (done) break;
			accumulated += textDecoder.decode(value, { stream: true });
		}

		assert.ok(accumulated.includes("event: thinking_delta"));
		assert.ok(accumulated.includes("event: text_delta"));
		assert.ok(accumulated.includes("event: done"));
	});
});
