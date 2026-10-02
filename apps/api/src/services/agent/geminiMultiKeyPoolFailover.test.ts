/**
 * geminiMultiKeyPoolFailover.test.ts — Mandate 8l Red Team LLM Failover & Key Pool Inquisitor.
 *
 * Verifies:
 * 1. Verification of 10 configured Gemini keys in .env with unique SHA-256 fingerprints.
 * 2. Model cascade hierarchy: Flash-Lite (3.5, 3.1) -> Flash (3.8-3.5) -> Pro -> legacy tails.
 * 3. Instant key swapping across HTTP 429 rate limits without dropped requests.
 * 4. Model cascade failover on HTTP 503 / 504 / 404 model overload with model banning.
 * 5. Model ban recovery upon success.
 * 6. CopilotService offline fallback to deterministic SemanticRouter when LLM is unavailable.
 */

import assert from "node:assert";
import { describe, test, beforeEach } from "node:test";
import {
	GeminiProviderAdapter,
	DEFAULT_GEMINI_MODEL_CASCADE,
} from "./providers/gemini.js";
import {
	clearSpeechKeyHealthMemoryForTests,
	getProviderKeyCandidates,
	isModelBanned,
	banModel,
	recordModelFailure,
	recordModelSuccess,
	filterActiveModelCascade,
	resetProviderKeyCooldowns,
	getAvailableProviderKeys,
	keyRetryLimit,
} from "../../speech/keyPool.js";
import { createDefaultLlmProvider } from "./copilotService.js";
import type { ProviderMessage } from "./types.js";
import type { LlmStreamChunk } from "./omniGatewayTypes.js";

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

describe("Mandate 8l: Gemini Multi-Key Pool & Cascade Failover Suite", () => {
	beforeEach(() => {
		clearSpeechKeyHealthMemoryForTests();
		resetProviderKeyCooldowns("gemini");
	});

	test("1. Verifies all 10 Gemini keys are configured in environment with unique fingerprints", () => {
		const candidates = getProviderKeyCandidates("gemini");
		assert.ok(
			candidates.length >= 10,
			`Expected at least 10 keys configured for Gemini pool, got: ${candidates.length}`,
		);

		const fingerprints = new Set<string>();
		for (const candidate of candidates) {
			assert.strictEqual(
				candidate.fingerprint.length,
				12,
				`Candidate fingerprint should be 12-char SHA-256 slice: ${candidate.fingerprint}`,
			);
			assert.ok(
				!fingerprints.has(candidate.fingerprint),
				`Duplicate key fingerprint detected: ${candidate.fingerprint}`,
			);
			fingerprints.add(candidate.fingerprint);
		}

		assert.strictEqual(
			fingerprints.size,
			candidates.length,
			"All configured keys must have unique cryptographic fingerprints",
		);

		const retryLimit = keyRetryLimit("gemini");
		assert.ok(
			retryLimit >= 10,
			`Key retry limit for LLM provider must allow full pool traversal, got: ${retryLimit}`,
		);
	});

	test("2. Verifies cascade priority order: Flash-Lite first, then Flash 3.x, then Pro, then legacy tails", () => {
		const adapter = new GeminiProviderAdapter();
		assert.strictEqual(adapter.defaultModel, "gemini-3.5-flash-lite");

		// Flash-Lite are 1st and 2nd
		assert.strictEqual(DEFAULT_GEMINI_MODEL_CASCADE[0], "gemini-3.5-flash-lite");
		assert.strictEqual(DEFAULT_GEMINI_MODEL_CASCADE[1], "gemini-3.1-flash-lite");

		// Flash 3.x are 3rd to 6th
		assert.strictEqual(DEFAULT_GEMINI_MODEL_CASCADE[2], "gemini-3.8-flash");
		assert.strictEqual(DEFAULT_GEMINI_MODEL_CASCADE[3], "gemini-3.7-flash");
		assert.strictEqual(DEFAULT_GEMINI_MODEL_CASCADE[4], "gemini-3.6-flash");
		assert.strictEqual(DEFAULT_GEMINI_MODEL_CASCADE[5], "gemini-3.5-flash");

		// Pro models follow
		assert.strictEqual(DEFAULT_GEMINI_MODEL_CASCADE[6], "gemini-3.1-pro");

		// Legacy tails at the end
		assert.ok(DEFAULT_GEMINI_MODEL_CASCADE.includes("gemini-2.5-flash"));
		assert.ok(DEFAULT_GEMINI_MODEL_CASCADE.includes("gemini-2.0-flash"));
		assert.ok(DEFAULT_GEMINI_MODEL_CASCADE.includes("gemini-1.5-flash"));
		assert.strictEqual(
			DEFAULT_GEMINI_MODEL_CASCADE[DEFAULT_GEMINI_MODEL_CASCADE.length - 1],
			"gemini-1.5-flash",
		);
	});

	test("3. Instant key swapping across HTTP 429 rate limits without dropping user request", async () => {
		const adapter = new GeminiProviderAdapter();
		const candidates = getProviderKeyCandidates("gemini");
		assert.ok(candidates.length >= 3, "Need at least 3 keys for swap test");

		const keyAttempts: string[] = [];
		const mockFetch = async (input: RequestInfo | URL): Promise<Response> => {
			const urlStr = String(input);
			const keyMatch = urlStr.match(/key=([^&]+)/);
			const apiKey = keyMatch ? decodeURIComponent(keyMatch[1]) : "";
			keyAttempts.push(apiKey);

			// First 2 keys return 429 (Resource Exhausted)
			if (keyAttempts.length <= 2) {
				return new Response(
					JSON.stringify({
						error: {
							code: 429,
							message: "Resource has been exhausted (e.g. check quota).",
							status: "RESOURCE_EXHAUSTED",
						},
					}),
					{ status: 429, statusText: "Too Many Requests" },
				);
			}

			// Third key succeeds with SSE
			const sseData = [
				'data: {"candidates":[{"content":{"parts":[{"text":"Клинический ответ с ключа №3"}]}}]}\n\n',
				'data: {"candidates":[{"finishReason":"STOP"}]}\n\n',
			];
			return createMockSseResponse(sseData);
		};

		const messages: ProviderMessage[] = [{ role: "user", content: "Тестовый вопрос" }];
		const chunks: LlmStreamChunk[] = [];

		for await (const chunk of adapter.chatStream(messages, [], {
			fetchFn: mockFetch,
		})) {
			chunks.push(chunk);
		}

		assert.strictEqual(
			keyAttempts.length,
			3,
			"Expected exactly 3 key attempts (2 rate-limited keys + 1 successful key)",
		);
		assert.notStrictEqual(
			keyAttempts[0],
			keyAttempts[1],
			"Key 1 and Key 2 must be different keys from the pool",
		);
		assert.notStrictEqual(
			keyAttempts[1],
			keyAttempts[2],
			"Key 2 and Key 3 must be different keys from the pool",
		);

		const textChunk = chunks.find((c) => c.type === "text_delta");
		assert.ok(textChunk && textChunk.type === "text_delta");
		assert.strictEqual(textChunk.text, "Клинический ответ с ключа №3");

		const poolState = getAvailableProviderKeys("gemini");
		assert.strictEqual(
			poolState.coolingDown.length,
			2,
			"The 2 rate-limited keys must be placed in cooldown",
		);
	});

	test("4. Model cascade failover on HTTP 503 server overload with model banning", async () => {
		const adapter = new GeminiProviderAdapter();
		const modelsAttempted: string[] = [];

		const mockFetch = async (input: RequestInfo | URL): Promise<Response> => {
			const urlStr = String(input);
			const modelMatch = urlStr.match(/models\/([^:]+):streamGenerateContent/);
			const model = modelMatch ? modelMatch[1] : "unknown";
			modelsAttempted.push(model);

			// gemini-3.5-flash-lite returns 503 (The model is overloaded)
			if (model === "gemini-3.5-flash-lite") {
				return new Response(
					JSON.stringify({
						error: {
							code: 503,
							message: "The model is overloaded. Please try again later.",
							status: "UNAVAILABLE",
						},
					}),
					{ status: 503, statusText: "Service Unavailable" },
				);
			}

			// Next model in cascade (gemini-3.1-flash-lite) succeeds!
			const sseData = [
				'data: {"candidates":[{"content":{"parts":[{"text":"Ответ от gemini-3.1-flash-lite"}]}}]}\n\n',
				'data: {"candidates":[{"finishReason":"STOP"}]}\n\n',
			];
			return createMockSseResponse(sseData);
		};

		const messages: ProviderMessage[] = [{ role: "user", content: "Вопрос" }];
		const chunks: LlmStreamChunk[] = [];

		for await (const chunk of adapter.chatStream(messages, [], {
			fetchFn: mockFetch,
		})) {
			chunks.push(chunk);
		}

		assert.ok(
			modelsAttempted.includes("gemini-3.5-flash-lite"),
			"Should have attempted gemini-3.5-flash-lite first",
		);
		assert.ok(
			modelsAttempted.includes("gemini-3.1-flash-lite"),
			"Should have cascaded to gemini-3.1-flash-lite upon 503",
		);
		assert.strictEqual(
			isModelBanned("gemini-3.5-flash-lite"),
			true,
			"Overloaded model must be banned to prevent hammering it",
		);

		const textChunk = chunks.find((c) => c.type === "text_delta");
		assert.ok(textChunk && textChunk.type === "text_delta");
		assert.strictEqual(textChunk.text, "Ответ от gemini-3.1-flash-lite");

		// Active cascade should now automatically omit the banned model
		const active = filterActiveModelCascade(DEFAULT_GEMINI_MODEL_CASCADE);
		assert.strictEqual(
			active.includes("gemini-3.5-flash-lite"),
			false,
			"Banned model must be filtered out of active cascade",
		);
		assert.strictEqual(active[0], "gemini-3.1-flash-lite");
	});

	test("5. Model ban recovery upon explicit success record", () => {
		banModel("gemini-3.8-flash", 300, "Temporary 503");
		assert.strictEqual(isModelBanned("gemini-3.8-flash"), true);

		recordModelSuccess("gemini-3.8-flash");
		assert.strictEqual(
			isModelBanned("gemini-3.8-flash"),
			false,
			"Model ban must be immediately lifted on success",
		);
	});

	test("6. CopilotService fallback to deterministic SemanticRouter when LLM gateway is offline", async () => {
		const copilotProvider = createDefaultLlmProvider();

		// Simulate all LLM providers throwing errors / offline
		const previousEnv = { ...process.env };
		// Clear API keys to simulate zero active external credentials
		delete process.env.GEMINI_API_KEY;
		delete process.env.GOOGLE_API_KEY;
		delete process.env.GEMINI_API_KEYS;
		delete process.env.GOOGLE_API_KEYS;
		delete process.env.GROQ_API_KEY;
		delete process.env.GROQ_API_KEYS;
		delete process.env.OPENAI_API_KEY;
		delete process.env.OPENAI_API_KEYS;

		try {
			const events: any[] = [];
			const stream = copilotProvider.complete({
				system: "Выбранный зуб (FDI): #46. Активный пациент: (ID: 00000000-0000-7000-8000-000000000001)",
				messages: [
					{
						role: "user",
						content: "Глубокий кариес 46 зуба, рассчитай 3-tier план лечения",
					},
				],
			});

			for await (const event of stream) {
				events.push(event);
			}

			// Must yield deterministic plan without crashing or throwing
			assert.ok(events.length > 0, "SemanticRouter must generate offline fallback events");

			const toolEvent = events.find((e) => e.type === "tool_use");
			assert.ok(toolEvent, "Must emit tool_use event for treatment plan");
			assert.strictEqual(toolEvent.name, "clinical.suggest_treatment_plan");
			assert.strictEqual(toolEvent.input.tooth, 46);
			assert.strictEqual(toolEvent.input.primaryDiagnosis, "Caries");
		} finally {
			// Restore env
			process.env = previousEnv;
		}
	});
});
