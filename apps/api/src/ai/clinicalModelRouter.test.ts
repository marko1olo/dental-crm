/**
 * @file clinicalModelRouter.test.ts
 * @description SSOT Tests for DENTE Clinical Model Router & Universal BYOK Key Validation.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { routeClinicalTask } from "./clinicalModelRouter.js";
import { validateUniversalApiKeyLive } from "./router/modelAdapters.js";

describe("DENTE Clinical Model Router & Task Classifier Suite", () => {
	test("1. Server-Managed: routes short chairside queries to chairside_fast (<300ms, 500 RPD)", () => {
		const result = routeClinicalTask({
			messages: [
				{ role: "user", content: "Запиши пациента на завтра в 14:00" },
			],
			speedMode: "turbo",
		});

		assert.equal(result.tier, "chairside_fast");
		assert.equal(result.model, "gemini-3.5-flash-lite");
		assert.ok(result.rationale.includes("chairside"));
	});

	test("2. Server-Managed: routes deep surgical protocols & 54-FZ calculations to clinical_reasoning", () => {
		const result = routeClinicalTask({
			messages: [
				{
					role: "user",
					content:
						"Сформируй протокол операции: дентальная имплантация в области 46 зуба, остеоинтеграция, расчет сметы и 54-ФЗ",
				},
			],
		});

		assert.equal(result.tier, "clinical_reasoning");
		assert.equal(result.model, "gemini-3.6-flash");
		assert.ok(result.rationale.includes("мышление"));
	});

	test("3. Server-Managed: routes radiograph and visiograph queries to clinical_vision", () => {
		const result = routeClinicalTask({
			messages: [
				{ role: "user", content: "Анализ КЛКТ снимка 26 зуба, периапикальный очаг" },
			],
		});

		assert.equal(result.tier, "clinical_vision");
		assert.equal(result.model, "gemini-3.6-flash");
		assert.ok(result.rationale.includes("рентгенологических"));
	});

	test("4. Custom BYOK: routes correctly to user's custom key, model and provider", () => {
		const result = routeClinicalTask({
			messages: [{ role: "user", content: "Привет" }],
			modelRoutingMode: "custom_byok",
			byokProvider: "openai",
			byokApiKey: "sk-proj-test1234567890",
			byokModel: "gpt-4o",
		});

		assert.equal(result.tier, "custom_byok");
		assert.equal(result.provider, "openai");
		assert.equal(result.model, "gpt-4o");
		assert.equal(result.apiKey, "sk-proj-test1234567890");
		assert.equal(result.baseUrl, "https://api.openai.com/v1");
	});

	test("5. Universal Key Validator: detects empty key and returns graceful error without throwing", async () => {
		const result = await validateUniversalApiKeyLive("gemini", "");
		assert.equal(result.valid, false);
		assert.ok(result.error?.includes("не заполнен"));
	});

	test("6. Universal Key Validator: handles mock successful probe cleanly", async () => {
		const mockFetch: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					choices: [{ message: { content: "pong" } }],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);

		const result = await validateUniversalApiKeyLive(
			"openai",
			"sk-test-valid-key-99999",
			"gpt-4o-mini",
			undefined,
			mockFetch,
		);

		assert.equal(result.valid, true);
		assert.equal(result.provider, "openai");
		assert.ok(result.latencyMs >= 0);
	});

	test("7. SOTA Cascade: cascades gemini-3.6-flash -> gemini-3.5-flash when primary model is banned/cooldown", () => {
		const bannedSet = new Set(["gemini-3.6-flash"]);
		const result = routeClinicalTask({
			messages: [
				{
					role: "user",
					content: "Сформируй протокол операции: имплантация зуба 46, остеоинтеграция",
				},
			],
			isModelBanned: (m) => bannedSet.has(m),
		});

		assert.equal(result.tier, "clinical_reasoning");
		assert.equal(result.model, "gemini-3.5-flash");
		assert.ok(result.rationale.includes("Каскад SOTA"));
	});

	test("8. SOTA Cascade: cascades to Groq llama-3.3-70b-versatile when all Gemini models are on cooldown", () => {
		const bannedSet = new Set([
			"gemini-3.6-flash",
			"gemini-3.5-flash",
			"gemini-3.8-flash",
		]);
		const result = routeClinicalTask({
			messages: [
				{ role: "user", content: "КТ снимок 16 зуба, деструкция костной ткани" },
			],
			isModelBanned: (m) => bannedSet.has(m),
		});

		assert.equal(result.tier, "clinical_vision");
		assert.equal(result.model, "llama-3.3-70b-versatile");
		assert.equal(result.provider, "groq");
		assert.equal(result.baseUrl, "https://api.groq.com/openai/v1");
		assert.ok(result.rationale.includes("Каскад SOTA"));
	});

	test("9. Universal Key Validator: validates Groq keys via api.groq.com/openai/v1", async () => {
		let capturedUrl = "";
		const mockFetch: typeof fetch = async (url) => {
			capturedUrl = String(url);
			return new Response(
				JSON.stringify({ choices: [{ message: { content: "pong" } }] }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const result = await validateUniversalApiKeyLive(
			"groq",
			"gsk_mock_valid_key",
			"llama-3.3-70b-versatile",
			undefined,
			mockFetch,
		);

		assert.equal(result.valid, true);
		assert.equal(result.provider, "groq");
		assert.ok(capturedUrl.startsWith("https://api.groq.com/openai/v1"));
	});

	test("10. Universal Key Validator: validates Anthropic keys via api.anthropic.com/v1/messages with x-api-key", async () => {
		let capturedUrl = "";
		let capturedHeaderKey = "";
		const mockFetch: typeof fetch = async (url, init) => {
			capturedUrl = String(url);
			const headers = (init?.headers as Record<string, string>) || {};
			capturedHeaderKey = headers["x-api-key"] || "";
			return new Response(
				JSON.stringify({ content: [{ text: "pong" }] }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const result = await validateUniversalApiKeyLive(
			"anthropic",
			"sk-ant-test-mock-key",
			"claude-3-5-sonnet-20241022",
			undefined,
			mockFetch,
		);

		assert.equal(result.valid, true);
		assert.equal(result.provider, "anthropic");
		assert.ok(capturedUrl.startsWith("https://api.anthropic.com/v1/messages"));
		assert.equal(capturedHeaderKey, "sk-ant-test-mock-key");
	});
});
