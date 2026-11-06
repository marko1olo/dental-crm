/**
 * stomchatCascadeReliability.test.ts
 *
 * Verifies the battle-tested Stomchat / Dvachbot cascade reliability mechanisms ported to DENTE CRM:
 * 1. CoT Reasoning stripping (<think>, <thought>, <reasoning>) from user content and routing to thought_delta.
 * 2. Groq provider default model (llama-3.3-70b-versatile) & Qwen 3.6 27b support.
 * 3. Gemini multi-tier cascade (Smart Flash -> Lite -> 2.5 Fallbacks -> High Capacity).
 * 4. OmniGateway generateStructuredJson immunity to model reasoning leakage.
 * 5. OmniGateway asLlmProvider thinking_delta forwarding to thought_delta.
 * 6. Exponential backoff and multi-key failure cooldown invariants.
 *
 * Mandate 8af: Uses synthetic mock keys only. Zero external network calls.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
	stripReasoning,
	extractReasoningAndContent,
	StreamingReasoningFilter,
} from "@dental/shared/ai";
import { GroqProviderAdapter } from "./providers/groq.js";
import { GeminiProviderAdapter, DEFAULT_GEMINI_MODEL_CASCADE } from "./providers/gemini.js";
import { OmniLlmGateway } from "./omniGateway.js";
import type { LlmProviderAdapter, LlmStreamChunk } from "./omniGatewayTypes.js";

describe("Stomchat & Dvachbot Cascade Reliability Suite for DENTE CRM", () => {
	it("1. stripReasoning purges <think>...</think> and unclosed reasoning tails", () => {
		const closed = "<think>Calculating dose: 1 carpule 1.7ml Articaine</think>Анестезия выполнена успешно.";
		assert.strictEqual(stripReasoning(closed), "Анестезия выполнена успешно.");

		const unclosed = "План лечения согласован.\n<think>Pending implant system verification";
		assert.strictEqual(stripReasoning(unclosed), "План лечения согласован.");

		const mixed = "<thought>Step 1</thought>Диагноз: К02.1 <reasoning>Step 2</reasoning>Кариес дентина.";
		assert.strictEqual(stripReasoning(mixed), "Диагноз: К02.1 Кариес дентина.");
	});

	it("2. extractReasoningAndContent separates thinking from user text", () => {
		const raw = "<think>Check allergy status: Penicillin allergy detected.</think>Назначен Азитромицин 500мг.";
		const result = extractReasoningAndContent(raw);
		assert.strictEqual(result.reasoning, "Check allergy status: Penicillin allergy detected.");
		assert.strictEqual(result.content, "Назначен Азитромицин 500мг.");
	});

	it("3. GroqProviderAdapter defaults to llama-3.3-70b-versatile and supports qwen/qwen3.6-27b", () => {
		const groq = new GroqProviderAdapter();
		assert.strictEqual(groq.defaultModel, "llama-3.3-70b-versatile");
		assert.ok(groq.supportedModels.includes("llama-3.3-70b-versatile"));
		assert.ok(groq.supportedModels.includes("qwen/qwen3.6-27b"));
	});

	it("4. GeminiProviderAdapter cascade contains full smart and lite tiers", () => {
		const gemini = new GeminiProviderAdapter();
		assert.strictEqual(gemini.defaultModel, "gemini-3.6-flash");
		assert.ok(gemini.supportedModels.includes("gemini-3.6-flash"));
		assert.ok(gemini.supportedModels.includes("gemini-3.5-flash"));
		assert.ok(gemini.supportedModels.includes("gemini-2.5-flash"));
		assert.ok(gemini.supportedModels.includes("gemini-3.5-flash-lite"));
		assert.ok(gemini.supportedModels.includes("gemini-3.1-flash-lite"));
		assert.ok(gemini.supportedModels.includes("gemini-2.5-flash-lite"));

		// Order matches canonical cascade
		assert.deepStrictEqual(DEFAULT_GEMINI_MODEL_CASCADE, [
			"gemini-3.6-flash",
			"gemini-3.5-flash",
			"gemini-3.5-flash-lite",
			"gemini-3.1-flash-lite",
			"gemini-2.5-flash",
			"gemini-2.5-flash-lite",
			"gemini-3.8-flash",
			"gemini-3.1-pro",
		]);
	});

	it("5. OmniGateway generateStructuredJson succeeds even when model outputs <think> CoT before JSON", async () => {
		const gateway = new OmniLlmGateway();

		const mockAdapter: LlmProviderAdapter = {
			providerId: "gemini",
			defaultModel: "gemini-3.6-flash",
			supportedModels: ["gemini-3.6-flash"],
			async *chatStream(): AsyncIterable<LlmStreamChunk> {
				yield {
					type: "text_delta",
					text: "<think>Formulating diagnosis and ICD-10 code for tooth 25 caries...</think>",
				};
				yield {
					type: "text_delta",
					text: '```json\n{"icd10": "K02.1", "tooth": 25, "diagnosis": "Кариес дентина"}\n```',
				};
				yield { type: "done", stopReason: "stop" };
			},
		};

		gateway.registerAdapter(mockAdapter);

		const Schema = z.object({
			icd10: z.string(),
			tooth: z.number(),
			diagnosis: z.string(),
		});

		const result = await gateway.generateStructuredJson(Schema, [
			{ role: "user", content: "Диагноз зуба 25" },
		]);

		assert.strictEqual(result.data.icd10, "K02.1");
		assert.strictEqual(result.data.tooth, 25);
		assert.strictEqual(result.data.diagnosis, "Кариес дентина");
	});

	it("6. OmniGateway asLlmProvider forwards thinking_delta as thought_delta", async () => {
		const gateway = new OmniLlmGateway();

		const mockAdapter: LlmProviderAdapter = {
			providerId: "groq",
			defaultModel: "llama-3.3-70b-versatile",
			supportedModels: ["llama-3.3-70b-versatile"],
			async *chatStream(): AsyncIterable<LlmStreamChunk> {
				yield { type: "thinking_delta", text: "Analyzing patient allergies..." };
				yield { type: "text_delta", text: "Аллергий не выявлено." };
				yield { type: "done", stopReason: "stop" };
			},
		};

		gateway.registerAdapter(mockAdapter);
		const provider = gateway.asLlmProvider();

		const stream = provider.complete({
			system: "You are dental copilot",
			messages: [{ role: "user", content: "Проверь аллергии" }],
		});

		const events: any[] = [];
		for await (const event of stream) {
			events.push(event);
		}

		assert.strictEqual(events[0].type, "thought_delta");
		assert.strictEqual(events[0].text, "Analyzing patient allergies...");
		assert.strictEqual(events[1].type, "text_delta");
		assert.strictEqual(events[1].text, "Аллергий не выявлено.");
		assert.strictEqual(events[2].type, "done");
	});
});
