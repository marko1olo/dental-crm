/**
 * @file clinicalModelRouter.test.ts
 * @description SSOT Tests for DENTE Clinical Model Router & Universal BYOK Key Validation.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { routeClinicalTask } from "./clinicalModelRouter.js";
import { validateUniversalApiKeyLive } from "./router/modelAdapters.js";

describe("DENTE Clinical Model Router & Task Classifier Suite", () => {
	test("1. Server-Managed: routes short chairside queries to chairside_fast (<400ms)", () => {
		const result = routeClinicalTask({
			messages: [
				{ role: "user", content: "Запиши пациента на завтра в 14:00" },
			],
			speedMode: "turbo",
		});

		assert.equal(result.tier, "chairside_fast");
		assert.equal(result.model, "gemini-2.5-flash");
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
		assert.equal(result.model, "gemini-2.5-pro");
		assert.ok(result.rationale.includes("мышление"));
	});

	test("3. Server-Managed: routes radiograph and visiograph queries to clinical_vision", () => {
		const result = routeClinicalTask({
			messages: [
				{ role: "user", content: "Анализ КЛКТ снимка 26 зуба, периапикальный очаг" },
			],
		});

		assert.equal(result.tier, "clinical_vision");
		assert.equal(result.model, "gemini-2.5-flash");
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
});
