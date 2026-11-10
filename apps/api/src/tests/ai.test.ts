import assert from "node:assert";
import { afterEach, beforeEach, describe, test } from "node:test";
import { buildVisitDraftFromTranscript } from "../ai/visitDraft.js";

describe("buildVisitDraftFromTranscript", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	test("falls back to rule-based parser on AI JSON parsing error", async () => {
		process.env.DENTAL_AI_NEURAL_DRAFT = "true";
		process.env.DENTAL_SPEECH_POLISH_PROVIDER = "custom";
		process.env.DENTAL_SPEECH_POLISH_BASE_URL = "http://localhost:9999";
		process.env.DENTAL_SPEECH_POLISH_API_KEY = "fake";
		process.env.DENTAL_SPEECH_POLISH_MODEL = "test-model";

		const originalFetch = global.fetch;
		global.fetch = async () => {
			return new Response("{ malformed: json", {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		try {
			const result = await buildVisitDraftFromTranscript(
				"Пациент жалуется на боль в 36 зубе.",
				"universal",
			);
			const hasWarning = result.warnings.some((w) =>
				w.includes(
					"ИИ-генерация черновика не выполнена, применен локальный разбор",
				),
			);
			assert.strictEqual(
				hasWarning,
				true,
				"Expected fallback warning to be present",
			);
		} finally {
			global.fetch = originalFetch;
		}
	});
});
