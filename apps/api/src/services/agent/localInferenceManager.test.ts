/**
 * localInferenceManager.test.ts — Comprehensive Test Suite for Local On-Premise LLM Inference & 152-FZ Air-Gap.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { AgentContext } from "./context.js";
import {
	LOCAL_MODEL_PROFILES,
	LocalInferenceManager,
	createLocalInferenceManager,
} from "./localInferenceManager.js";
import { AgentOrchestrator } from "./orchestrator.js";
import {
	AirGapViolationError,
	DEFAULT_LOCAL_INFERENCE_URL,
	LocalInferenceConnectionError,
	LocalInferenceError,
	LocalInferenceTimeoutError,
	LocalOllamaProvider,
	OPEN_MODEL_MISTRAL_NEMO,
	OPEN_MODEL_QWEN_7B,
	OPEN_MODEL_SAIGA_8B,
	createLocalOllamaProvider,
	formatMessagesForOpenAi,
	isAirGapCompliantUrl,
	normalizeOpenAiBaseUrl,
} from "./providers/localOllama.js";
import { registerClinicalTools } from "./tools/clinicalTools.js";
import { ToolRegistry } from "./tools/registry.js";
import type { ProviderMessage } from "./types.js";

/**
 * Creates a mock fetch response with an SSE ReadableStream.
 */
function createMockSseResponse(sseChunks: string[], status = 200): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			for (const chunk of sseChunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});

	return new Response(stream, {
		status,
		headers: { "Content-Type": "text/event-stream" },
	});
}

describe("152-FZ Air-Gap Security Boundary & URL Validation", () => {
	test("allows loopback addresses (localhost, 127.0.0.1, ::1)", () => {
		assert.strictEqual(isAirGapCompliantUrl("http://localhost:11434/v1").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://127.0.0.1:11434/v1").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://[::1]:11434/v1").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://0.0.0.0:8000/v1").compliant, true);
	});

	test("allows RFC 1918 private IPv4 networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)", () => {
		// 10.x.x.x
		assert.strictEqual(isAirGapCompliantUrl("http://10.0.1.50:11434/v1").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://10.254.0.1:8000/v1").compliant, true);

		// 172.16.x.x - 172.31.x.x
		assert.strictEqual(isAirGapCompliantUrl("http://172.16.0.1:11434/v1").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://172.24.10.5:8000/v1").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://172.31.255.254:11434/v1").compliant, true);

		// 192.168.x.x
		assert.strictEqual(isAirGapCompliantUrl("http://192.168.1.100:11434/v1").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://192.168.0.1:8000/v1").compliant, true);

		// 169.254.x.x (Link-Local)
		assert.strictEqual(isAirGapCompliantUrl("http://169.254.12.34:11434/v1").compliant, true);
	});

	test("allows on-prem internal clinic domain suffixes (.local, .lan, .internal, .home.arpa)", () => {
		assert.strictEqual(isAirGapCompliantUrl("http://ollama-gpu.clinic.local:11434").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://ai-server.dental.lan:8000").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://saiga-inference.internal:11434").compliant, true);
		assert.strictEqual(isAirGapCompliantUrl("http://node1.home.arpa:11434").compliant, true);
	});

	test("allows explicitly configured custom on-prem hostnames", () => {
		const allowed = ["custom-ai-rig", "hospital-server", "node1.dente.clinic"];
		assert.strictEqual(
			isAirGapCompliantUrl("http://custom-ai-rig:11434", allowed).compliant,
			true,
		);
		assert.strictEqual(
			isAirGapCompliantUrl("http://hospital-server:8000", allowed).compliant,
			true,
		);
		assert.strictEqual(
			isAirGapCompliantUrl("http://node1.dente.clinic:11434", allowed).compliant,
			true,
		);
	});

	test("strictly rejects public external IP addresses, public gTLDs, and cloud LLM endpoints", () => {
		// Public IPv4
		assert.strictEqual(isAirGapCompliantUrl("http://8.8.8.8:11434/v1").compliant, false);
		assert.strictEqual(isAirGapCompliantUrl("http://93.184.216.34:11434/v1").compliant, false);
		assert.strictEqual(isAirGapCompliantUrl("http://172.32.0.1:11434/v1").compliant, false);

		// Public gTLDs (.clinic, .com, .io) without explicit whitelist
		assert.strictEqual(isAirGapCompliantUrl("http://node1.dente.clinic:11434").compliant, false);
		assert.strictEqual(isAirGapCompliantUrl("http://ai.dental-hospital.com:11434").compliant, false);

		// Cloud endpoints
		assert.strictEqual(
			isAirGapCompliantUrl("https://api.openai.com/v1").compliant,
			false,
		);
		assert.strictEqual(
			isAirGapCompliantUrl("https://api.groq.com/openai/v1").compliant,
			false,
		);
		assert.strictEqual(
			isAirGapCompliantUrl("https://api.anthropic.com/v1").compliant,
			false,
		);
	});

	test("throws AirGapViolationError when initializing provider with external URL in air-gap mode", () => {
		assert.throws(
			() => {
				new LocalOllamaProvider({
					baseUrl: "https://api.openai.com/v1",
					airGapMode: true,
				});
			},
			(err: unknown) => {
				return err instanceof AirGapViolationError && err.code === "AIR_GAP_EGRESS_BLOCKED";
			},
		);
	});

	test("throws AirGapViolationError when updating manager base URL in air-gap mode", () => {
		const manager = new LocalInferenceManager({
			baseUrl: "http://127.0.0.1:11434/v1",
			airGapMode: true,
		});

		assert.throws(
			() => {
				manager.setBaseUrl("https://external-cloud.example.com/v1");
			},
			(err: unknown) => err instanceof AirGapViolationError,
		);
	});
});

describe("Local Model Profiles & Metadata", () => {
	test("contains verified profiles for Saiga-8B, Qwen-2.5-7B, and Mistral-Nemo", () => {
		assert.ok(LOCAL_MODEL_PROFILES[OPEN_MODEL_SAIGA_8B]);
		assert.strictEqual(LOCAL_MODEL_PROFILES[OPEN_MODEL_SAIGA_8B].contextWindow, 8192);
		assert.strictEqual(LOCAL_MODEL_PROFILES[OPEN_MODEL_SAIGA_8B].supportsToolCalling, true);

		assert.ok(LOCAL_MODEL_PROFILES[OPEN_MODEL_QWEN_7B]);
		assert.strictEqual(LOCAL_MODEL_PROFILES[OPEN_MODEL_QWEN_7B].contextWindow, 32768);
		assert.strictEqual(LOCAL_MODEL_PROFILES[OPEN_MODEL_QWEN_7B].supportsToolCalling, true);

		assert.ok(LOCAL_MODEL_PROFILES[OPEN_MODEL_MISTRAL_NEMO]);
		assert.strictEqual(LOCAL_MODEL_PROFILES[OPEN_MODEL_MISTRAL_NEMO].contextWindow, 16384);
	});

	test("manager returns appropriate profile by fuzzy model name", () => {
		const manager = new LocalInferenceManager({ defaultModel: "saiga_llama3_8b" });

		const saigaProfile = manager.getModelProfile("saiga:8b");
		assert.strictEqual(saigaProfile.id, OPEN_MODEL_SAIGA_8B);

		const qwenProfile = manager.getModelProfile("qwen2.5-7b-instruct");
		assert.strictEqual(qwenProfile.id, OPEN_MODEL_QWEN_7B);

		const mistralProfile = manager.getModelProfile("mistral-nemo:12b");
		assert.strictEqual(mistralProfile.id, OPEN_MODEL_MISTRAL_NEMO);

		const fallbackProfile = manager.getModelProfile("custom-llama-3");
		assert.strictEqual(fallbackProfile.id, "custom-llama-3");
		assert.strictEqual(fallbackProfile.supportsToolCalling, true);
	});
});

describe("Local Inference Health Probe & Discovery", () => {
	test("probes Ollama via /api/tags and parses available models", async () => {
		const mockFetch: typeof fetch = async (input, init) => {
			const url = String(input);
			if (url.includes("/api/tags")) {
				return new Response(
					JSON.stringify({
						models: [
							{ name: "saiga_llama3_8b:latest", size: 4900000000 },
							{ name: "qwen2.5:7b", size: 4700000000 },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response("Not found", { status: 404 });
		};

		const manager = createLocalInferenceManager({
			baseUrl: "http://127.0.0.1:11434/v1",
			defaultModel: "saiga_llama3_8b:latest",
			fetchFn: mockFetch,
		});

		const probe = await manager.probe({ force: true });
		assert.strictEqual(probe.online, true);
		assert.strictEqual(probe.providerType, "ollama");
		assert.deepStrictEqual(probe.availableModels, ["saiga_llama3_8b:latest", "qwen2.5:7b"]);
		assert.strictEqual(probe.airGapSafe, true);

		const isAvailable = await manager.isAvailable();
		assert.strictEqual(isAvailable, true);

		const models = await manager.listModels();
		assert.strictEqual(models.length, 2);
	});

	test("probes OpenAI-compatible endpoint (vLLM / LM Studio) via /models", async () => {
		const mockFetch: typeof fetch = async (input, init) => {
			const url = String(input);
			if (url.includes("/models")) {
				return new Response(
					JSON.stringify({
						data: [
							{ id: "qwen2.5-7b-instruct", object: "model" },
							{ id: "mistral-nemo", object: "model" },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response("Not found", { status: 404 });
		};

		const manager = createLocalInferenceManager({
			baseUrl: "http://127.0.0.1:8000/v1",
			defaultModel: "qwen2.5-7b-instruct",
			fetchFn: mockFetch,
		});

		const probe = await manager.probe({ force: true });
		assert.strictEqual(probe.online, true);
		assert.strictEqual(probe.providerType, "vllm");
		assert.deepStrictEqual(probe.availableModels, ["qwen2.5-7b-instruct", "mistral-nemo"]);
	});

	test("handles probe failure when local inference server is offline", async () => {
		const mockFetch: typeof fetch = async () => {
			throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
		};

		const manager = createLocalInferenceManager({
			baseUrl: "http://127.0.0.1:11434/v1",
			fetchFn: mockFetch,
		});

		const probe = await manager.probe({ force: true });
		assert.strictEqual(probe.online, false);
		assert.strictEqual(probe.providerType, "offline");
		assert.strictEqual(probe.availableModels.length, 0);
		assert.match(probe.error ?? "", /ECONNREFUSED|Не удалось установить соединение/);

		const isAvailable = await manager.isAvailable();
		assert.strictEqual(isAvailable, false);
	});
});

describe("LocalOllamaProvider Message & Request Formatting", () => {
	test("formats system, user, and assistant messages into OpenAI format", () => {
		const messages: ProviderMessage[] = [
			{ role: "user", content: "Привет, найди карту пациента Иванова" },
			{
				role: "assistant",
				content: [
					{ type: "text", text: "Ищу пациента в базе данных клиники..." },
					{
						type: "tool_use",
						id: "call_123",
						name: "clinical.find_patient",
						input: { query: "Иванов" },
					},
				],
			},
			{
				role: "tool",
				content: [
					{
						type: "tool_result",
						toolCallId: "call_123",
						content: { patientId: "p_1", name: "Иванов И.И." },
					},
				],
			},
		];

		const formatted = formatMessagesForOpenAi("Вы — ассистент DENTE.", messages);
		assert.strictEqual(formatted.length, 4);
		assert.strictEqual(formatted[0].role, "system");
		assert.strictEqual(formatted[0].content, "Вы — ассистент DENTE.");

		assert.strictEqual(formatted[1].role, "user");
		assert.strictEqual(formatted[1].content, "Привет, найди карту пациента Иванова");

		assert.strictEqual(formatted[2].role, "assistant");
		assert.strictEqual(formatted[2].content, "Ищу пациента в базе данных клиники...");
		assert.ok(Array.isArray(formatted[2].tool_calls));

		assert.strictEqual(formatted[3].role, "tool");
		assert.strictEqual(formatted[3].tool_call_id, "call_123");
	});

	test("normalizes base URLs properly", () => {
		assert.strictEqual(normalizeOpenAiBaseUrl("http://127.0.0.1:11434"), "http://127.0.0.1:11434/v1");
		assert.strictEqual(normalizeOpenAiBaseUrl("http://127.0.0.1:11434/"), "http://127.0.0.1:11434/v1");
		assert.strictEqual(normalizeOpenAiBaseUrl("http://127.0.0.1:11434/v1/"), "http://127.0.0.1:11434/v1");
	});
});

describe("LocalOllamaProvider Streaming & Tool Calling", () => {
	test("streams text deltas and yields done stop reason", async () => {
		const sseChunks = [
			'data: {"choices":[{"delta":{"content":"Здравст"}}]}\n\n',
			'data: {"choices":[{"delta":{"content":"вуйте!"}}]}\n\n',
			'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":15,"completion_tokens":5}}\n\n',
			"data: [DONE]\n\n",
		];

		const mockFetch: typeof fetch = async () => createMockSseResponse(sseChunks);

		const provider = createLocalOllamaProvider({
			baseUrl: "http://127.0.0.1:11434/v1",
			defaultModel: "saiga_llama3_8b",
			fetchFn: mockFetch,
		});

		const events = [];
		for await (const event of provider.complete({
			system: "Тестовая система",
			messages: [{ role: "user", content: "Привет" }],
		})) {
			events.push(event);
		}

		assert.ok(events.length >= 3);
		assert.deepStrictEqual(events[0], { type: "text_delta", text: "Здравст" });
		assert.deepStrictEqual(events[1], { type: "text_delta", text: "вуйте!" });
		assert.deepStrictEqual(events[2], { type: "usage", inputTokens: 15, outputTokens: 5 });
		assert.deepStrictEqual(events[3], { type: "done", stopReason: "stop" });
	});

	test("handles fragmented tool call streaming and reassembles arguments", async () => {
		const sseChunks = [
			`data: ${JSON.stringify({
				choices: [
					{
						delta: {
							tool_calls: [
								{
									index: 0,
									id: "call_abc",
									function: {
										name: "clinical.find_patient",
										arguments: '{"que',
									},
								},
							],
						},
					},
				],
			})}\n\n`,
			`data: ${JSON.stringify({
				choices: [
					{
						delta: {
							tool_calls: [
								{
									index: 0,
									function: {
										arguments: 'ry":"Иванов"}',
									},
								},
							],
						},
					},
				],
			})}\n\n`,
			`data: ${JSON.stringify({
				choices: [{ finish_reason: "tool_calls" }],
			})}\n\n`,
			"data: [DONE]\n\n",
		];

		const mockFetch: typeof fetch = async () => createMockSseResponse(sseChunks);

		const provider = createLocalOllamaProvider({
			baseUrl: "http://127.0.0.1:11434/v1",
			defaultModel: "qwen2.5:7b",
			fetchFn: mockFetch,
		});

		const events = [];
		for await (const event of provider.complete({
			system: "Тест инструментов",
			messages: [{ role: "user", content: "Найди Иванова" }],
			tools: [
				{
					type: "function",
					function: {
						name: "clinical.find_patient",
						parameters: { type: "object", properties: { query: { type: "string" } } },
					},
				},
			],
		})) {
			events.push(event);
		}

		assert.strictEqual(events.length, 2);
		assert.strictEqual(events[0].type, "tool_use");
		if (events[0].type === "tool_use") {
			assert.strictEqual(events[0].id, "call_abc");
			assert.strictEqual(events[0].name, "clinical.find_patient");
			assert.deepStrictEqual(events[0].input, { query: "Иванов" });
		}
		assert.deepStrictEqual(events[1], { type: "done", stopReason: "tool_calls" });
	});

	test("handles connection errors when local inference server is not running", async () => {
		const mockFetch: typeof fetch = async () => {
			throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
		};

		const provider = createLocalOllamaProvider({
			baseUrl: "http://127.0.0.1:11434/v1",
			fetchFn: mockFetch,
		});

		await assert.rejects(
			async () => {
				for await (const _ of provider.complete({
					system: "test",
					messages: [{ role: "user", content: "ping" }],
				})) {
					// stream
				}
			},
			(err: unknown) => {
				return (
					err instanceof LocalInferenceConnectionError &&
					err.code === "LOCAL_INFERENCE_CONNECTION_REFUSED"
				);
			},
		);
	});

	test("handles timeout when local inference server is unresponsive", async () => {
		const mockFetch: typeof fetch = async (_input, init): Promise<Response> => {
			const signal = init?.signal as AbortSignal | undefined;
			return new Promise<Response>((_, reject) => {
				if (signal) {
					signal.addEventListener("abort", () => {
						const abortError = new Error("The operation was aborted.");
						abortError.name = "AbortError";
						reject(abortError);
					});
				}
			});
		};

		const provider = createLocalOllamaProvider({
			baseUrl: "http://127.0.0.1:11434/v1",
			timeoutMs: 50,
			fetchFn: mockFetch,
		});

		await assert.rejects(
			async () => {
				for await (const _ of provider.complete({
					system: "test",
					messages: [{ role: "user", content: "ping" }],
				})) {
					// stream
				}
			},
			(err: unknown) => {
				return (
					err instanceof LocalInferenceTimeoutError &&
					err.code === "LOCAL_INFERENCE_TIMEOUT" &&
					err.statusCode === 408
				);
			},
		);
	});
});

describe("AgentOrchestrator Integration with LocalOllamaProvider & Air-Gap", () => {
	test("runs complete turn in Air-Gap mode executing clinical read tool", async () => {
		let callCount = 0;
		const mockFetch: typeof fetch = async (input, init) => {
			callCount++;
			if (callCount === 1) {
				// Turn 1: Model decides to call clinical.find_patient
				const sseChunks = [
					'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_patient_1","function":{"name":"clinical.find_patient","arguments":"{\\"query\\":\\"Петров\\"}"}}]}}]}\n\n',
					'data: {"choices":[{"finish_reason":"tool_calls"}]}\n\n',
					"data: [DONE]\n\n",
				];
				return createMockSseResponse(sseChunks);
			}

			// Turn 2: Model summarizes the finding
			const sseChunks = [
				'data: {"choices":[{"delta":{"content":"Пациент Петров П.П. найден в базе (ID: 00000000-0000-7000-8000-000000000004)."}}]}\n\n',
				'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
				"data: [DONE]\n\n",
			];
			return createMockSseResponse(sseChunks);
		};

		const registry = new ToolRegistry();
		registerClinicalTools(registry, "clinical");

		const ctx: AgentContext = {
			organizationId: "00000000-0000-7000-8000-000000000001",
			clinicId: "00000000-0000-7000-8000-000000000002",
			userId: "00000000-0000-7000-8000-000000000003",
			sessionId: "test-air-gap-session-001",
			mode: "autonomous",
			permissions: ["patients.read", "clinical.read"],
			tools: registry,
			db: null,
		};

		const localProvider = createLocalOllamaProvider({
			baseUrl: "http://127.0.0.1:11434/v1",
			defaultModel: "saiga_llama3_8b",
			airGapMode: true,
			fetchFn: mockFetch,
		});

		const history: ProviderMessage[] = [
			{ role: "user", content: "Найди данные пациента Петров" },
		];

		const turnEvents = [];
		for await (const event of AgentOrchestrator.runTurnStream({
			ctx,
			provider: localProvider,
			system: "Вы — медицинский ассистент DENTE на локальном сервере 152-ФЗ.",
			history,
			toolNames: registry.list(),
		})) {
			turnEvents.push(event);
		}

		assert.strictEqual(callCount, 2, "Should execute 2 turns (tool call + tool answer)");

		const toolStarted = turnEvents.find((e) => e.type === "tool_call_started");
		assert.ok(toolStarted, "Should emit tool_call_started event");

		const toolFinished = turnEvents.find((e) => e.type === "tool_call_finished");
		assert.ok(toolFinished, "Should emit tool_call_finished event");

		const finalEvent = turnEvents.find((e) => e.type === "final");
		assert.ok(finalEvent, "Should reach final event");

		// History must contain assistant tool use, tool result, and final assistant message
		assert.strictEqual(history.length, 4);
		assert.strictEqual(history[0].role, "user");
		assert.strictEqual(history[1].role, "assistant");
		assert.strictEqual(history[2].role, "tool");
		assert.strictEqual(history[3].role, "assistant");
	});
});
